import { app, initTools, loadFromLocalStorage, pushState, undo, redo, clearAll, copySelection, cutSelection, pasteSelection, activeGuides, setActiveGuides } from './state.js';
import { createToolsUI, createGlobalSettingsUI, createSettingsUI, setupCollapsibles, setupTabs, setupTextEditing, setupOutputInteraction, resizeCanvas, setTool, updateSetting, updateUIFromShape, updateUIFromGlobalSettings, updateUndoRedoUI, canvas, output, coordsDisplay, copyToClipboard } from './ui.js';
import { render } from './renderer.js';
import { generateCode } from './latexGenerator.js';
import { getPos, getSelectionBounds, toTikZ } from './utils.js';
import { ShapeManager, getShapeAtPos } from './shapes.js';
import { GLOBAL_SETTINGS_CONFIG, UI_CONSTANTS, TOOL_CONFIG, SETTINGS_CONFIG } from './config.js';
import { DrawingTool, SelectTool, DuplicateTool, DeleteTool, RaiseTool, LowerTool, EyedropperTool } from './tools.js';
import { alignSelected, distributeSelected, matchSize, rotateSelected, generateInitialState } from './state.js';

const initialState = generateInitialState();

let currentState = { ...initialState };

// Gestionnaires d'événements souris
function onMouseDown(e) {
	if (app.activeTool instanceof EyedropperTool) {
		app.activeTool.onMouseDown(e);
		return;
	}

	if (e.button === 1 || e.code === 'Space' || (e.shiftKey && e.button === 0 && app.activeTool === app.toolManager.select)) {
		app.isPanning = true;
		app.lastMouse = { x: e.clientX, y: e.clientY };
		canvas.parentElement.classList.add('grabbing');
		return;
	}

	if (app.activeTool && app.activeTool.onMouseDown) {
		app.activeTool.onMouseDown(e);
	}
}

function onMouseMove(e) {
	if (app.isPanning) {
		const dx = e.clientX - app.lastMouse.x;
		const dy = e.clientY - app.lastMouse.y;
		app.view.x += dx;
		app.view.y += dy;
		app.lastMouse = { x: e.clientX, y: e.clientY };
		render();
		return;
	}

	const p = getPos(e);
	coordsDisplay.textContent = `x: ${toTikZ(p.x)}, y: ${toTikZ(p.y, true)} | Zoom: ${Math.round(app.view.scale * 100)}%`;
	
	if (app.activeTool && app.activeTool.onMouseMove) {
		app.activeTool.onMouseMove(e);
	}
}

function onMouseUp(e) {
	if (app.isPanning) {
		app.isPanning = false;
		canvas.parentElement.classList.remove('grabbing');
		return;
	}

	if (app.activeTool && app.activeTool.onMouseUp) {
		app.activeTool.onMouseUp(e);
	}
}

// Raccourcis clavier
function setupKeyboardShortcuts() {
	window.addEventListener('keydown', (e) => {
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (app.selectedShapes.length > 0) {
				const tool = app.toolManager['delete'];
				if (tool && tool.deleteSelected) tool.deleteSelected();
				else {
					app.selectedShapes.forEach(s => {
						const idx = app.shapes.indexOf(s);
						if (idx > -1) app.shapes.splice(idx, 1);
					});
					app.selectedShapes = [];
					app.selectedShape = null;
					generateCode();
					pushState();
					render();
				}
			}
		}

		if (e.ctrlKey || e.metaKey) {
			if (e.key === 'c') {
				e.preventDefault();
				copySelection();
			} else if (e.key === 'x') {
				e.preventDefault();
				cutSelection();
			} else if (e.key === 'v') {
				e.preventDefault();
				pasteSelection(true);
			} else if (e.key === 'd') {
				e.preventDefault();
				if (app.selectedShapes.length > 0) {
					copySelection();
					pasteSelection(false);
				}
			} else if (e.key === 'z') {
				e.preventDefault();
				undo();
			} else if (e.key === 'y' || (e.shiftKey && e.key === 'Z')) {
				e.preventDefault();
				redo();
			} else if (e.key === 'a') {
				e.preventDefault();
				app.selectedShapes = [...app.shapes];
				if(app.selectedShapes.length > 0) {
					app.selectedShape = app.selectedShapes[0];
					updateUIFromShape(app.selectedShape);
				}
				setTool('select');
				render();
			}
		}

		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
			if (app.selectedShapes.length > 0) {
				e.preventDefault();
				const step = e.shiftKey ? 1 : UI_CONSTANTS.GRID_SIZE;
				let dx = 0;
				let dy = 0;
				
				if (e.key === 'ArrowUp') dy = -step;
				if (e.key === 'ArrowDown') dy = step;
				if (e.key === 'ArrowLeft') dx = -step;
				if (e.key === 'ArrowRight') dx = step;

				app.selectedShapes.forEach(s => ShapeManager[s.type].move(s, dx, dy));
				updateUIFromShape(app.selectedShape);
				render();
				generateCode();
			}
		}
	});
	
	window.addEventListener('keyup', (e) => {
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
			if (app.selectedShapes.length > 0) {
				pushState();
			}
		}
	});
}

// Fonction d'initialisation principale
function init() {
	createToolsUI();
	createGlobalSettingsUI();
	createSettingsUI();
	setupCollapsibles();
	setupTabs();
	setupTextEditing();
	/* Cette fonctionnalité ne fonctionne pas et activée, cause beaucoup de lag
	Il faut la laisser désactivée
	setupOutputInteraction();  */
	
	document.getElementById('global-settings-container').addEventListener('input', (e) => {
		if (e.target.dataset.global) {
			updateSetting(e.target);
		}
	});

	document.getElementById('settings-container').addEventListener('input', (e) => {
		if (e.target.dataset.setting) {
			updateSetting(e.target);
		}
	});
	
	document.getElementById('alignLeft').addEventListener('click', () => alignSelected('left'));
	document.getElementById('alignCenter').addEventListener('click', () => alignSelected('center'));
	document.getElementById('alignRight').addEventListener('click', () => alignSelected('right'));
	document.getElementById('alignTop').addEventListener('click', () => alignSelected('top'));
	document.getElementById('alignMiddle').addEventListener('click', () => alignSelected('middle'));
	document.getElementById('alignBottom').addEventListener('click', () => alignSelected('bottom'));
	document.getElementById('matchWidth').addEventListener('click', () => matchSize('width'));
	document.getElementById('matchHeight').addEventListener('click', () => matchSize('height'));
	document.getElementById('rotateCCW').addEventListener('click', () => rotateSelected(-90));
	document.getElementById('rotateCW').addEventListener('click', () => rotateSelected(90));
	document.getElementById('distH').addEventListener('click', () => distributeSelected('h'));
	document.getElementById('distV').addEventListener('click', () => distributeSelected('v'));

	const defaultGlobalState = {};
	for (const key in GLOBAL_SETTINGS_CONFIG) {
		defaultGlobalState[key] = GLOBAL_SETTINGS_CONFIG[key].defaultValue;
	}

	app.drawingStyle = { ...generateInitialState(), ...defaultGlobalState };
	
	const toolHandlers = { DrawingTool, SelectTool, DuplicateTool, DeleteTool, RaiseTool, LowerTool, EyedropperTool };
	app.toolManager = {};
	for (const toolName in TOOL_CONFIG) {
		const config = TOOL_CONFIG[toolName];
		const HandlerClass = toolHandlers[config.handler];
		if (HandlerClass) {
			if (config.handler === 'DrawingTool') {
				app.toolManager[toolName] = new HandlerClass(toolName);
			} else {
				app.toolManager[toolName] = new HandlerClass();
			}
		}
	}

	document.getElementById('undoBtn').addEventListener('click', undo);
	document.getElementById('redoBtn').addEventListener('click', redo);
	document.getElementById('clearBtn').addEventListener('click', clearAll);
	document.getElementById('copyBtn').addEventListener('click', copyToClipboard);

	canvas.addEventListener('mousedown', onMouseDown);
	canvas.addEventListener('mousemove', onMouseMove);
	canvas.addEventListener('mouseup', onMouseUp);
	canvas.addEventListener('mouseleave', onMouseUp);
	canvas.addEventListener('contextmenu', e => e.preventDefault());
	window.addEventListener('resize', resizeCanvas);
	
	canvas.addEventListener('wheel', (e) => {
		e.preventDefault();
		const zoomSensitivity = 0.001;
		const delta = -e.deltaY * zoomSensitivity;
		const oldScale = app.view.scale;
		let newScale = oldScale + delta * oldScale;
		
		newScale = Math.max(UI_CONSTANTS.MIN_ZOOM, Math.min(UI_CONSTANTS.MAX_ZOOM, newScale));
		
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		
		const worldX = (mouseX - app.view.x) / oldScale;
		const worldY = (mouseY - app.view.y) / oldScale;
		
		app.view.x = mouseX - worldX * newScale;
		app.view.y = mouseY - worldY * newScale;
		app.view.scale = newScale;
		
		const zoomSlider = document.getElementById('canvasZoom');
		if(zoomSlider) {
			zoomSlider.value = newScale * 100;
			const valSpan = document.getElementById('canvasZoomValue');
			if(valSpan) valSpan.textContent = `${Math.round(newScale * 100)}%`;
		}
		
		render();
	}, { passive: false });
	
	resizeCanvas();

	const loaded = loadFromLocalStorage();
	if (!loaded) {
		setTool('select');
		if (app.history.length === 0) pushState();
		render();
		generateCode();
	} else {
		updateUIFromGlobalSettings();
	}
	
	setupKeyboardShortcuts();
	
	updateUIFromShape(app.selectedShape);
}

// Démarrage
document.addEventListener('DOMContentLoaded', init);