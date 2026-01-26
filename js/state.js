import { SETTINGS_CONFIG, GLOBAL_SETTINGS_CONFIG, TOOL_CONFIG, UI_CONSTANTS } from './config.js';
import { render } from './renderer.js';
import { updateUIFromShape, updateUndoRedoUI, updateUIFromGlobalSettings, updateUIFromDrawingStyle, setTool } from './ui.js';
import { generateCode } from './latexGenerator.js';
import { ShapeManager } from './shapes.js';
import { DrawingTool, SelectTool, DuplicateTool, DeleteTool, RaiseTool, LowerTool, EyedropperTool } from './tools.js';
import { getSelectionBounds, screenToWorld } from './utils.js';
import { canvas } from './ui.js';

export function generateInitialState() {
	const state = {};
	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const prop = config.propName || key;
		state[prop] = config.defaultValue;
	}
	return state;
}

// L'état global de l'application
export const app = {
	shapes: [],
	history: [],
	historyIndex: -1,
	currentShape: null,
	selectedShape: null,
	selectedShapes: [],
	hoveredShape: null,
	selectionBox: { startX: 0, startY: 0, w: 0, h: 0, active: false },
	activeTool: null,
	drawingStyle: {},
	colors: new Map(),
	toolManager: {},
	view: { x: 0, y: 0, scale: 1 },
	isPanning: false,
	lastMouse: { x: 0, y: 0 },
	snapMarker: null,
	clipboard: [],
	nextShapeId: 0,
	isPreviewMode: false
};

// Variable exportée pour le renderer (guides dynamiques)
export let activeGuides = [];
// Fonction pour mettre à jour les guides (utilisée par getPos dans utils.js)
export function setActiveGuides(guides) { activeGuides = guides; }

export function pushState() {
	app.history = app.history.slice(0, app.historyIndex + 1);
	
	const selectionIndices = app.selectedShapes.map(selected => app.shapes.indexOf(selected)).filter(i => i !== -1);
	
	const state = {
		shapes: app.shapes,
		selection: selectionIndices
	};

	app.history.push(JSON.stringify(state));
	app.historyIndex++;
	updateUndoRedoUI();
	saveToLocalStorage();
}

export function undo() {
	if (app.historyIndex > 0) {
		app.historyIndex--;
		const stateData = JSON.parse(app.history[app.historyIndex]);
		
		if (Array.isArray(stateData)) {
			app.shapes = stateData;
			app.selectedShapes = [];
		} else {
			app.shapes = stateData.shapes || [];
			app.selectedShapes = [];
			if (stateData.selection && Array.isArray(stateData.selection)) {
				stateData.selection.forEach(index => {
					if (app.shapes[index]) {
						app.selectedShapes.push(app.shapes[index]);
					}
				});
			}
		}
		
		app.selectedShape = app.selectedShapes.length > 0 ? app.selectedShapes[0] : null;
		
		render();
		generateCode();
		updateUIFromShape(app.selectedShape);
		updateUndoRedoUI();
		saveToLocalStorage();
	}
}

export function redo() {
	if (app.historyIndex < app.history.length - 1) {
		app.historyIndex++;
		const stateData = JSON.parse(app.history[app.historyIndex]);
		
		if (Array.isArray(stateData)) {
			app.shapes = stateData;
			app.selectedShapes = [];
		} else {
			app.shapes = stateData.shapes || [];
			app.selectedShapes = [];
			if (stateData.selection && Array.isArray(stateData.selection)) {
				stateData.selection.forEach(index => {
					if (app.shapes[index]) {
						app.selectedShapes.push(app.shapes[index]);
					}
				});
			}
		}

		app.selectedShape = app.selectedShapes.length > 0 ? app.selectedShapes[0] : null;

		render();
		generateCode();
		updateUIFromShape(app.selectedShape);
		updateUndoRedoUI();
		saveToLocalStorage();
	}
}

export function clearAll() {
	app.shapes = [];
	app.selectedShapes = [];
	app.selectedShape = null;
	app.hoveredShape = null;
	app.selectionBox = { startX: 0, startY: 0, w: 0, h: 0, active: false };
	app.history = [];
	app.historyIndex = -1;
	app.nextShapeId = 0;
	pushState();
	render();
	generateCode();
	saveToLocalStorage();
}

export function resetDrawingStyle() {
	const defaults = generateInitialState();
	
	for (const key in defaults) {
		app.drawingStyle[key] = defaults[key];
	}

	if (app.selectedShapes.length > 0) {
		app.selectedShapes.forEach(s => {
			const allowed = TOOL_CONFIG[s.type].allow || [];
			for (const key in SETTINGS_CONFIG) {
				if (allowed.includes(key)) {
					const config = SETTINGS_CONFIG[key];
					const prop = config.propName || key;
					s.style[prop] = config.defaultValue;
				}
			}
		});
		generateCode();
		pushState();
		render();
		updateUIFromShape(app.selectedShape);
	} else {
		updateUIFromDrawingStyle();
	}
}

export function copySelection() {
	if (app.selectedShapes.length > 0) {
		app.clipboard = app.selectedShapes.map(s => JSON.parse(JSON.stringify(s)));
	}
}

export function cutSelection() {
	if (app.selectedShapes.length > 0) {
		copySelection();
		const tool = app.toolManager['delete'];
		if (tool && tool.deleteSelected) {
			tool.deleteSelected();
		} else {
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

export function pasteSelection(atMouse = false) {
	if (!app.clipboard || app.clipboard.length === 0) return;

	const newShapes = app.clipboard.map(s => JSON.parse(JSON.stringify(s)));
	const bounds = getSelectionBounds(newShapes);
	
	let dx = 0;
	let dy = 0;

	if (atMouse) {
		const mouseWorld = screenToWorld(app.lastMouse.x, app.lastMouse.y);
		dx = mouseWorld.x - bounds.cx;
		dy = mouseWorld.y - bounds.cy;
	} else {
		const visibleWidth = canvas.width / app.view.scale;
		const visibleHeight = canvas.height / app.view.scale;
		const centerX = -app.view.x / app.view.scale + visibleWidth / 2;
		const centerY = -app.view.y / app.view.scale + visibleHeight / 2;
		
		dx = centerX - bounds.cx;
		dy = centerY - bounds.cy;
		
		if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
			dx = UI_CONSTANTS.GRID_SIZE;
			dy = UI_CONSTANTS.GRID_SIZE;
		}
	}

	newShapes.forEach(s => {
		s.id = app.nextShapeId++;
		ShapeManager[s.type].move(s, dx, dy);
		app.shapes.push(s);
	});

	app.selectedShapes = newShapes;
	app.selectedShape = newShapes.length > 0 ? newShapes[0] : null;
	
	if (app.activeTool !== app.toolManager.select) {
		setTool('select');
	}

	generateCode();
	pushState();
	render();
}

export function alignSelected(mode) {
	if (app.selectedShapes.length === 0) return;

	const alignToPage = document.getElementById('alignRelative').checked;
	let minX, maxX, minY, maxY, cx, cy;

	if (alignToPage) {
		const visibleWidth = canvas.width / app.view.scale;
		const visibleHeight = canvas.height / app.view.scale;
		minX = -app.view.x / app.view.scale;
		minY = -app.view.y / app.view.scale;
		maxX = minX + visibleWidth;
		maxY = minY + visibleHeight;
		cx = (minX + maxX) / 2;
		cy = (minY + maxY) / 2;
	} else {
		if (app.selectedShapes.length < 2) return;
		const bounds = getSelectionBounds(app.selectedShapes);
		minX = bounds.minX;
		minY = bounds.minY;
		maxX = bounds.maxX;
		maxY = bounds.maxY;
		cx = bounds.cx;
		cy = bounds.cy;
	}

	app.selectedShapes.forEach(s => {
		const box = ShapeManager[s.type].getBoundingBox(s);
		const sCx = (box.minX + box.maxX) / 2;
		const sCy = (box.minY + box.maxY) / 2;
		let dx = 0, dy = 0;

		switch(mode) {
			case 'left': dx = minX - box.minX; break;
			case 'center': dx = cx - sCx; break;
			case 'right': dx = maxX - box.maxX; break;
			case 'top': dy = minY - box.minY; break;
			case 'middle': dy = cy - sCy; break;
			case 'bottom': dy = maxY - box.maxY; break;
		}

		ShapeManager[s.type].move(s, dx, dy);
	});

	render();
	generateCode();
	pushState();
}

export function distributeSelected(axis) {
	if (app.selectedShapes.length < 2) return;

	const shapes = [...app.selectedShapes];
	const spacingInput = document.getElementById('distSpacing');
	const manualSpacing = spacingInput.value ? parseFloat(spacingInput.value) * UI_CONSTANTS.SCALE : null;

	if (axis === 'h') {
		shapes.sort((a, b) => ShapeManager[a.type].getBoundingBox(a).minX - ShapeManager[b.type].getBoundingBox(b).minX);
		
		if (manualSpacing !== null) {
			let currentX = ShapeManager[shapes[0].type].getBoundingBox(shapes[0]).minX;
			shapes.forEach((s) => {
				const box = ShapeManager[s.type].getBoundingBox(s);
				const dx = currentX - box.minX;
				ShapeManager[s.type].move(s, dx, 0);
				currentX += (box.maxX - box.minX) + manualSpacing;
			});
		} else {
			if (shapes.length < 3) return;
			const first = ShapeManager[shapes[0].type].getBoundingBox(shapes[0]);
			const last = ShapeManager[shapes[shapes.length-1].type].getBoundingBox(shapes[shapes.length-1]);
			
			let totalWidth = 0;
			shapes.forEach(s => {
				const b = ShapeManager[s.type].getBoundingBox(s);
				totalWidth += (b.maxX - b.minX);
			});
			totalWidth -= (first.maxX - first.minX);
			totalWidth -= (last.maxX - last.minX);

			const totalSpan = last.minX - first.maxX;
			const gap = totalSpan / (shapes.length - 1); 
			
			const startX = first.minX;
			const totalDist = last.maxX - first.minX;
			
			const centers = shapes.map(s => {
				const b = ShapeManager[s.type].getBoundingBox(s);
				return (b.minX + b.maxX) / 2;
			});
			
			const step = (centers[centers.length-1] - centers[0]) / (shapes.length - 1);
			
			shapes.forEach((s, i) => {
				if (i === 0 || i === shapes.length - 1) return;
				const box = ShapeManager[s.type].getBoundingBox(s);
				const currentCenter = (box.minX + box.maxX) / 2;
				const targetCenter = centers[0] + step * i;
				ShapeManager[s.type].move(s, targetCenter - currentCenter, 0);
			});
		}
	} else {
		shapes.sort((a, b) => ShapeManager[a.type].getBoundingBox(a).minY - ShapeManager[b.type].getBoundingBox(b).minY);
		
		if (manualSpacing !== null) {
			let currentY = ShapeManager[shapes[0].type].getBoundingBox(shapes[0]).minY;
			shapes.forEach((s) => {
				const box = ShapeManager[s.type].getBoundingBox(s);
				const dy = currentY - box.minY;
				ShapeManager[s.type].move(s, 0, dy);
				currentY += (box.maxY - box.minY) + manualSpacing;
			});
		} else {
			if (shapes.length < 3) return;
			const centers = shapes.map(s => {
				const b = ShapeManager[s.type].getBoundingBox(s);
				return (b.minY + b.maxY) / 2;
			});
			
			const step = (centers[centers.length-1] - centers[0]) / (shapes.length - 1);

			shapes.forEach((s, i) => {
				if (i === 0 || i === shapes.length - 1) return;
				const box = ShapeManager[s.type].getBoundingBox(s);
				const currentCenter = (box.minY + box.maxY) / 2;
				const targetCenter = centers[0] + step * i;
				ShapeManager[s.type].move(s, 0, targetCenter - currentCenter);
			});
		}
	}

	render();
	generateCode();
	pushState();
}

export function matchSize(dimension) {
	if (app.selectedShapes.length < 2) return;
	
	let maxWidth = 0;
	let maxHeight = 0;
	
	app.selectedShapes.forEach(s => {
		const box = ShapeManager[s.type].getBoundingBox(s);
		maxWidth = Math.max(maxWidth, box.maxX - box.minX);
		maxHeight = Math.max(maxHeight, box.maxY - box.minY);
	});

	app.selectedShapes.forEach(s => {
		const box = ShapeManager[s.type].getBoundingBox(s);
		const cx = (box.minX + box.maxX) / 2;
		const cy = (box.minY + box.maxY) / 2;
		const currentW = box.maxX - box.minX;
		const currentH = box.maxY - box.minY;
		
		let targetW = currentW;
		let targetH = currentH;

		if (dimension === 'width') targetW = maxWidth;
		if (dimension === 'height') targetH = maxHeight;
		
		if (s.type === 'rect' || s.type === 'image' || s.type === 'ellipse' || s.type === 'flow_process' || s.type === 'flow_start' || s.type === 'flow_decision') {
			const halfW = targetW / 2;
			const halfH = targetH / 2;
			s.x1 = cx - halfW;
			s.x2 = cx + halfW;
			s.y1 = cy - halfH;
			s.y2 = cy + halfH;
		} else if (s.type === 'circle') {
			const size = dimension === 'width' ? maxWidth : maxHeight;
			const r = size / 2;
			s.x1 = cx; s.y1 = cy; 
			s.x2 = cx + r; s.y2 = cy; 
		}
	});

	render();
	generateCode();
	pushState();
}

export function rotateSelected(angle) {
	if (app.selectedShapes.length === 0) return;

	const bounds = getSelectionBounds(app.selectedShapes);
	const rad = angle * Math.PI / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	app.selectedShapes.forEach(s => {
		const center = getShapeCenter(s);
		const dx = center.x - bounds.cx;
		const dy = center.y - bounds.cy;
		
		const nx = bounds.cx + dx * cos - dy * sin;
		const ny = bounds.cy + dx * sin + dy * cos;
		
		ShapeManager[s.type].move(s, nx - center.x, ny - center.y);
		
		const oldRot = s.style.rotate || 0;
		s.style.rotate = (oldRot + angle + 360) % 360;
	});

	render();
	generateCode();
	pushState();
}

export function saveToLocalStorage() {
	const uiState = [];
	document.querySelectorAll('.panel-group').forEach((group, index) => {
		const header = group.querySelector('.panel-header');
		if (header) {
			uiState.push({
				index: index,
				collapsed: header.classList.contains('collapsed')
			});
		}
	});

	const activeToolId = Object.keys(app.toolManager).find(key => app.toolManager[key] === app.activeTool);
	const selectionIndices = app.selectedShapes.map(selected => app.shapes.indexOf(selected)).filter(i => i !== -1);

	const fullState = {
		shapes: app.shapes,
		selection: selectionIndices,
		history: app.history,
		historyIndex: app.historyIndex,
		drawingStyle: app.drawingStyle,
		activeToolId: activeToolId,
		uiState: uiState
	};
	localStorage.setItem('tikz_generator_data', JSON.stringify(fullState));
}

export function loadFromLocalStorage() {
	const data = localStorage.getItem('tikz_generator_data');
	if (!data) return false;

	try {
		const parsed = JSON.parse(data);
		app.history = parsed.history || [];
		app.historyIndex = parsed.historyIndex !== undefined ? parsed.historyIndex : -1;
		
		let maxId = -1;
		const processShapes = (shapes) => {
			return shapes.map(s => {
				if (s.id === undefined) s.id = app.nextShapeId++;
				if (s.id > maxId) maxId = s.id;
				return s;
			});
		};
		
		if (app.historyIndex >= 0 && app.history[app.historyIndex]) {
			const currentHistory = JSON.parse(app.history[app.historyIndex]);
			app.shapes = Array.isArray(currentHistory) ? currentHistory : (currentHistory.shapes || []);
			app.shapes = processShapes(app.shapes);

			app.selectedShapes = [];
			if (!Array.isArray(currentHistory) && currentHistory.selection) {
				currentHistory.selection.forEach(idx => {
					if (app.shapes[idx]) app.selectedShapes.push(app.shapes[idx]);
				});
			}
		} else {
			app.shapes = parsed.shapes || [];
			app.shapes = processShapes(app.shapes);
			app.selectedShapes = [];
			if (parsed.selection) {
				parsed.selection.forEach(idx => {
					if (app.shapes[idx]) app.selectedShapes.push(app.shapes[idx]);
				});
			}
		}
		
		app.nextShapeId = maxId + 1;

		app.selectedShape = app.selectedShapes.length > 0 ? app.selectedShapes[0] : null;

		app.drawingStyle = { ...app.drawingStyle, ...parsed.drawingStyle };

		if (parsed.uiState) {
			const groups = document.querySelectorAll('.panel-group');
			parsed.uiState.forEach(ui => {
				if (groups[ui.index]) {
					const header = groups[ui.index].querySelector('.panel-header');
					const body = groups[ui.index].querySelector('.panel-body');
					const icon = header ? header.querySelector('.toggle-icon') : null;

					if (header && body) {
						header.classList.toggle('collapsed', ui.collapsed);
						body.style.display = ui.collapsed ? 'none' : 'block';
						if (icon) {
							icon.style.transform = ui.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
						}
					}
				}
			});
		}

		updateUIFromGlobalSettings();
		updateUIFromDrawingStyle();
		updateUIFromShape(app.selectedShape);
		
		const savedToolId = parsed.activeToolId;
		if (savedToolId && app.toolManager[savedToolId]) {
			setTool(savedToolId);
		} else {
			setTool('select');
		}

		render();
		generateCode();
		updateUndoRedoUI();
		return true;
	} catch (e) {
		console.error(e);
		return false;
	}
}

// Fonction d'initialisation des outils
export function initTools() {
    const toolHandlers = { DrawingTool, SelectTool, DuplicateTool, DeleteTool, RaiseTool, LowerTool, EyedropperTool, PainterTool };
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
}