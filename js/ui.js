import { TOOL_CONFIG, SETTINGS_CONFIG, GLOBAL_SETTINGS_CONFIG, UI_CONSTANTS } from './config.js';
import { app, pushState, saveToLocalStorage } from './state.js';
import { render } from './renderer.js';
import { generateCode } from './latexGenerator.js';
import { toTikZ, tikzToPx, worldToScreen, getPos } from './utils.js';
import { ShapeManager, getShapeAtPos } from './shapes.js';
import { alignSelected, distributeSelected, matchSize, rotateSelected } from './state.js';
import { EyedropperTool } from './tools.js';

// Références DOM exportées
export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');
export const output = document.getElementById('output');
export const coordsDisplay = document.getElementById('coords');

export function createToolsUI() {
	const containers = {
		general: document.getElementById('tools-general'),
		drawing: document.getElementById('tools-drawing'),
		circuits: document.getElementById('tools-circuits'),
		optics: document.getElementById('tools-optics'),
		logic: document.getElementById('tools-logic'),
		flowchart: document.getElementById('tools-flowchart'),
		pseudo3d: document.getElementById('tools-pseudo3d')
	};

	Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

	for (const toolId in TOOL_CONFIG) {
		const config = TOOL_CONFIG[toolId];
		const button = document.createElement('button');
		button.className = 'tool-btn';
		button.dataset.tool = toolId;
		button.innerHTML = config.icon;
		button.title = config.displayName;
		
		button.addEventListener('click', () => setTool(toolId));
		
		const targetContainer = containers[config.group] || containers.drawing;
		if (targetContainer) {
			targetContainer.appendChild(button);
		}
	}
}

export function createSettingsUI() {
	const container = document.getElementById('settings-container');
	container.innerHTML = '';
	
	const settingsGroups = new Map();

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const groupName = config.group || `group-${key}`;

		if (!settingsGroups.has(groupName)) {
			settingsGroups.set(groupName, {
				configs: [],
				options: config.groupOptions || {}
			});
		}
		settingsGroups.get(groupName).configs.push({ key, ...config });
	}

	settingsGroups.forEach((groupInfo, groupName) => {
		const groupContainer = document.createElement('div');
		
		if (groupInfo.options.type === 'row') {
			groupContainer.className = 'control-row';
			groupContainer.style.display = 'flex';
			groupContainer.style.gap = '8px';
		} else {
			groupContainer.className = 'control-group-wrapper';
		}

		groupInfo.configs.forEach(config => {
			const key = config.key;
			const controlWrapper = document.createElement('div');
			controlWrapper.className = 'control-group';
			controlWrapper.id = `wrapper-${key}`;
			if(groupInfo.options.type === 'row') controlWrapper.style.flex = '1';
			
			let controlHtml = '';

			switch (config.type) {
				case 'textarea':
					controlHtml = `
						<label>${config.label}</label>
						<textarea id="${key}" data-setting="${key}" class="settings-input" rows="2"></textarea>`;
					break;
				case 'text':
					controlHtml = `
						<label>${config.label}</label>
						<input type="text" id="${key}" data-setting="${key}" class="settings-input" value="${config.defaultValue || ''}">`;
					break;
				case 'number':
					controlHtml = `
						<label>${config.label}</label>
						<input type="number" id="${key}" data-setting="${key}" class="settings-input" step="${config.step || 'any'}" value="${config.defaultValue || 0}">`;
					break;
				case 'select':
					controlHtml = `
						<label>${config.label}</label>
						<div class="select-wrapper">
							<select id="${key}" data-setting="${key}">
								${Object.entries(config.options).map(([val, text]) => `<option value="${val}">${text}</option>`).join('')}
							</select>
						</div>`;
					break;
				case 'range':
					const isPercent = config.unit === '%';
					const displayValue = isPercent ? `${config.defaultValue * 100}${config.unit}` : `${config.defaultValue}${config.unit}`;
					controlHtml = `
						<div class="slider-row">
							<label>${config.label}</label>
							<span id="${key}Value" style="font-family:'SF Mono', monospace; font-size: 0.7rem; opacity:0.7;">${displayValue}</span>
						</div>
						<input type="range" id="${key}" data-setting="${key}" min="${config.min}" max="${config.max}" step="${config.step}">`;
					break;
				case 'checkbox':
					controlHtml = `
						<div style="display: flex; align-items: center; justify-content: space-between; height: 32px;">
							<label style="margin: 0; cursor: pointer;" for="${key}">${config.label}</label>
							<input type="checkbox" id="${key}" data-setting="${key}">
						</div>`;
					break;
				case 'color':
					controlHtml = `
						<div class="color-input">
							<label>${config.label}</label>
							<input type="color" id="${key}" data-setting="${key}" style="height:32px; width:100%;">
						</div>`;
					break;
			}
			controlWrapper.innerHTML = controlHtml;
			groupContainer.appendChild(controlWrapper);
		});
		container.appendChild(groupContainer);
	});
}

export function createGlobalSettingsUI() {
	const container = document.getElementById('global-settings-container');
	container.innerHTML = '';

	for (const key in GLOBAL_SETTINGS_CONFIG) {
		const config = GLOBAL_SETTINGS_CONFIG[key];
		const wrapper = document.createElement('div');
		wrapper.className = 'control-group';
		
		let html = '';
		if (config.type === 'text') {
			html = `<label>${config.label}</label><input type="text" id="${key}" data-global="${key}" value="${config.defaultValue}">`;
		} else if (config.type === 'range') {
			html = `
				<div class="slider-row">
					<label>${config.label}</label>
					<span id="${key}Value">${config.defaultValue}${config.unit}</span>
				</div>
				<input type="range" id="${key}" data-global="${key}" min="${config.min}" max="${config.max}" step="${config.step}" value="${config.defaultValue}">`;
		} else if (config.type === 'color') {
			html = `<label>${config.label}</label><input type="color" id="${key}" data-global="${key}" value="${config.defaultValue}">`;
		} else if (config.type === 'select') {
			html = `
				<label>${config.label}</label>
				<div class="select-wrapper">
					<select id="${key}" data-global="${key}">
						${Object.entries(config.options).map(([val, text]) => `<option value="${val}" ${val === config.defaultValue ? 'selected' : ''}>${text}</option>`).join('')}
					</select>
				</div>`;
		} else if (config.type === 'checkbox') {
			html = `
				<div style="display: flex; align-items: center; justify-content: space-between; height: 32px;">
					<label style="margin: 0; cursor: pointer;" for="${key}">${config.label}</label>
					<input type="checkbox" id="${key}" data-global="${key}" ${config.defaultValue ? 'checked' : ''}>
				</div>`;
		}
		
		wrapper.innerHTML = html;
		container.appendChild(wrapper);
	}
}

export function createGeometryUI(s) {
	const container = document.getElementById('geometry-container');
	container.innerHTML = '';
	
	const props = [
		{ k: 'x1', label: 'X1' }, { k: 'y1', label: 'Y1', isY: true },
		{ k: 'x2', label: 'X2' }, { k: 'y2', label: 'Y2', isY: true },
		{ k: 'x3', label: 'X3' }, { k: 'y3', label: 'Y3', isY: true },
		{ k: 'cp1x', label: 'CX1' }, { k: 'cp1y', label: 'CY1', isY: true },
		{ k: 'cp2x', label: 'CX2' }, { k: 'cp2y', label: 'CY2', isY: true },
		{ k: 'radius', label: 'R', isScalar: true }
	];

	props.forEach(p => {
		if (s[p.k] !== undefined) {
			const row = document.createElement('div');
			row.className = 'geo-row';
			
			const label = document.createElement('label');
			label.textContent = p.label;
			
			const input = document.createElement('input');
			input.type = 'number';
			input.className = 'geo-input';
			input.step = '0.1';
			
			let val;
			if (p.isScalar) val = toTikZ(s[p.k]);
			else val = toTikZ(s[p.k], p.isY);
			
			input.value = val;
			
			input.addEventListener('change', (e) => {
				const newVal = parseFloat(e.target.value);
				if (isNaN(newVal)) return;

				let pxVal;
				if (p.isScalar) pxVal = newVal * UI_CONSTANTS.SCALE;
				else if (p.isY) pxVal = canvas.height - (newVal * UI_CONSTANTS.SCALE);
				else pxVal = newVal * UI_CONSTANTS.SCALE;

				s[p.k] = pxVal;
				
				render();
				generateCode();
				pushState();
			});

			row.appendChild(label);
			row.appendChild(input);
			container.appendChild(row);
		}
	});
}

export function resizeCanvas() {
	const container = canvas.parentElement;
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
	render();
}

// Fonction qui gère l'activation des outils et l'UI associée
export function setTool(toolName) {
	if (app.activeTool && app.activeTool.onDeactivate) {
		app.activeTool.onDeactivate();
	}
	
	document.querySelectorAll('.tool-btn').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.tool === toolName);
	});

	app.activeTool = app.toolManager[toolName];
	updateSettingsVisibility(toolName);

	if (app.activeTool && app.activeTool.onActivate) {
		app.activeTool.onActivate();
	}
	saveToLocalStorage();
	
	if (app.activeTool && app.activeTool.constructor.name === 'EyedropperTool') {
		canvas.style.cursor = 'none';
	} else if(app.activeTool && app.activeTool.config) {
		canvas.style.cursor = app.activeTool.config.cursor || 'default';
	} else {
		canvas.style.cursor = 'default';
	}
}

export function updateSetting(element) {
	const key = element.dataset.setting || element.dataset.global;
	const isGlobal = !!element.dataset.global;

	const config = isGlobal ? GLOBAL_SETTINGS_CONFIG[key] : SETTINGS_CONFIG[key];
	if (!config) return;

	let value;
	if (element.type === 'checkbox') {
		value = element.checked;
	} else if (config.type === 'range' || (config.type === 'number' && !isNaN(parseFloat(element.value)))) {
		value = parseFloat(element.value);
	} else {
		value = element.value;
	}

	const propName = config.propName || key;
	
	if (isGlobal) {
		app.drawingStyle[propName] = value;
	} else {
		app.drawingStyle[propName] = value; 
		if (app.selectedShapes.length > 0) {
			app.selectedShapes.forEach(s => {
				s.style[propName] = value;
			});
		}
	}

	if (config.type === 'range') {
		const valueSpan = document.getElementById(`${key}Value`);
		if (valueSpan) {
			const unit = config.unit || '';
			valueSpan.textContent = key === 'opacity' ? `${Math.round(value * 100)}%` : `${value}${unit}`;
		}
	}

	if (key === 'canvasZoom') {
		return; 
	}

	if (key === 'stageColor') {
		canvas.parentElement.style.backgroundColor = value;
	}

	if (key === 'arrowStyle' || key === 'freehandMode' || key === 'fillType') {
		const toolName = app.activeTool === app.toolManager.select ? 'select' : (app.activeTool.shapeType || 'select');
		const shapeType = app.selectedShape ? app.selectedShape.type : null;
		updateSettingsVisibility(toolName, shapeType);
	}

	render();
	generateCode();
	if (app.selectedShapes.length > 0 || isGlobal) {
		pushState();
	}
	saveToLocalStorage();
}

export function updateSettingsVisibility(toolName, shapeType = null) {
	const config = TOOL_CONFIG[toolName];
	if (!config) return;

	let allowed = config.allow || [];
	
	if (toolName === 'select') {
		if (shapeType) {
			const shapeConfig = TOOL_CONFIG[shapeType];
			if (shapeConfig && shapeConfig.allow) {
				allowed = shapeConfig.allow;
			}
		} else {
			allowed = [];
		}
	}

	const currentStyle = app.selectedShape ? app.selectedShape.style : app.drawingStyle;
	const arrowEnabled = currentStyle.arrow && currentStyle.arrow !== 'none';
	const roundedEnabled = currentStyle.freehandMode === 'rounded';
	const fillType = currentStyle.fillType || 'none';
	const gradientEnabled = fillType === 'linear' || fillType === 'radial';
	
	let hasVisibleSettings = false;

	for (const key in SETTINGS_CONFIG) {
		const wrapper = document.getElementById(`wrapper-${key}`);
		if (wrapper) {
			let isVisible = allowed.includes(key);

			if ((key === 'arrowHead' || key === 'arrowScale') && !arrowEnabled) {
				isVisible = false;
			}
			
			if (key === 'cornerRadius' && !roundedEnabled) {
				isVisible = false;
			}
			
			if (key === 'fillColor' && fillType === 'none') {
				isVisible = false;
			}

			if (key === 'fillColor2' && !gradientEnabled) {
				isVisible = false;
			}
			
			if (key === 'shadingAngle' && fillType !== 'linear') {
				isVisible = false;
			}

			if (isVisible) {
				wrapper.style.display = 'block';
				wrapper.parentElement.style.display = 'flex';
				if (wrapper.parentElement.classList.contains('control-group-wrapper')) {
					wrapper.parentElement.style.display = 'block';
				}
				hasVisibleSettings = true;
			} else {
				wrapper.style.display = 'none';
				const parent = wrapper.parentElement;
				const hasVisibleChildren = Array.from(parent.children).some(c => c.style.display !== 'none');
				if (!hasVisibleChildren) {
					parent.style.display = 'none';
				}
			}
		}
	}

	const settingsWrapper = document.getElementById('settings-wrapper');
	if (settingsWrapper) {
		settingsWrapper.style.display = hasVisibleSettings ? 'block' : 'none';
	}
}

export function updateUIFromShape(s) {
	const geoSection = document.getElementById('geometry-section');
	const geoGroup = geoSection ? geoSection.parentElement : null;

	if (!s) {
		if (geoGroup) geoGroup.style.display = 'none';
		return;
	}
	
	if (geoGroup) geoGroup.style.display = 'flex';
	createGeometryUI(s);

	const style = s.style;
	const fields = [
		'strokeColor', 'lineWidth', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale',
		'opacity', 'textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 
		'textRotate', 'textAnchor', 'textAlign', 'textWidth', 'gridStep',
		'polySides', 'starPoints', 'starRatio', 'simplifyTolerance', 'freehandMode', 'cornerRadius',
		'pointSize', 'pointType', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle',
		'plotFunction', 'plotDomainMin', 'plotDomainMax', 'plotYMin', 'plotYMax', 'plotSamples', 
		'plotXLabel', 'plotYLabel', 'plotGrid', 'plotAxisLines', 'plotMark', 'plotMarkSize', 
		'plotLegend', 'plotLegendPos'
	];
	
	fields.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			const config = SETTINGS_CONFIG[id];
			const prop = config ? (config.propName || id) : id;
			if (style[prop] !== undefined) {
				el.value = style[prop];
				if (config && config.type === 'range') {
					const valueSpan = document.getElementById(`${id}Value`);
					if (valueSpan) {
						const unit = config.unit || '';
						if (id === 'textWidth' && style[prop] === 0) {
							valueSpan.textContent = 'Auto';
						} else {
							valueSpan.textContent = id === 'opacity' ? `${Math.round(style[prop] * 100)}%` : `${style[prop]}${unit}`;
						}
					}
				}
			}
		}
	});

	const checkboxes = ['doubleLine', 'isClosed'];
	checkboxes.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			if (id === 'doubleLine') el.checked = !!style.double;
			else if (id === 'isClosed') el.checked = !!style.isClosed;
		}
	});

	updateSettingsVisibility('select', s.type);
}

export function updateUIFromDrawingStyle() {
	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const prop = config.propName || key;
		const val = app.drawingStyle[prop];
		const el = document.getElementById(key);
		
		if (el && val !== undefined) {
			if (config.type === 'checkbox') {
				el.checked = val;
			} else {
				el.value = val;
			}
			
			if (config.type === 'range') {
				const span = document.getElementById(`${key}Value`);
				if (span) {
					const unit = config.unit || '';
					if (key === 'textWidth' && val === 0) {
						span.textContent = 'Auto';
					} else {
						span.textContent = key === 'opacity' ? `${Math.round(val * 100)}%` : `${val}${unit}`;
					}
				}
			}
		}
	}
}

export function updateUIFromGlobalSettings() {
	for (const key in GLOBAL_SETTINGS_CONFIG) {
		const config = GLOBAL_SETTINGS_CONFIG[key];
		const el = document.getElementById(key);
		if (el) {
			const val = app.drawingStyle[key] !== undefined ? app.drawingStyle[key] : config.defaultValue;
			
			if (config.type === 'checkbox') {
				el.checked = val;
			} else {
				el.value = val;
			}
			
			if (config.type === 'range') {
				const span = document.getElementById(`${key}Value`);
				if (span) span.textContent = `${val}${config.unit || ''}`;
			}
			if (key === 'canvasZoom') canvas.parentElement.style.setProperty('--grid-size', `${val}px`);
			if (key === 'stageColor') canvas.parentElement.style.backgroundColor = val;
		}
	}
}

export function copyToClipboard() {
	const codeText = output.textContent;
	const copyBtn = document.getElementById('copyBtn');
	if (copyBtn.dataset.busy === 'true') return;
	
	copyBtn.dataset.busy = 'true';
	const originalContent = copyBtn.innerHTML;

	const showFeedback = (success) => {
		if (success) {
			copyBtn.innerHTML = '<i class="ti ti-check"></i> Copié !';
			copyBtn.classList.add('btn-copied');
			
			setTimeout(() => {
				copyBtn.innerHTML = originalContent;
				copyBtn.classList.remove('btn-copied');
				copyBtn.dataset.busy = 'false';
			}, 2000);

		} else {
			copyBtn.innerHTML = '<i class="ti ti-x"></i> Erreur';
			copyBtn.classList.remove('btn-primary', 'btn-copied');
			copyBtn.classList.add('btn-danger');

			setTimeout(() => {
				copyBtn.innerHTML = originalContent;
				copyBtn.classList.remove('btn-danger');
				copyBtn.classList.add('btn-primary');
				copyBtn.dataset.busy = 'false';
			}, 2000);
		}
	};

	if (navigator.clipboard) {
		navigator.clipboard.writeText(codeText)
			.then(() => showFeedback(true))
			.catch(err => {
				console.error('Could not copy text: ', err);
				showFeedback(false);
			});
	} else {
		const tempTextArea = document.createElement('textarea');
		tempTextArea.value = codeText;
		document.body.appendChild(tempTextArea);
		tempTextArea.select();
		try {
			const successful = document.execCommand('copy');
			showFeedback(successful);
		} catch (err) {
			console.error('Fallback: Oops, unable to copy', err);
			showFeedback(false);
		}
		document.body.removeChild(tempTextArea);
	}
}

export function setupCollapsibles() {
	document.querySelectorAll('.panel-header').forEach(header => {
		header.addEventListener('click', () => {
			const icon = header.querySelector('.toggle-icon');
			const body = header.nextElementSibling;
			if (body) {
				const isCollapsed = body.style.display === 'none';
				body.style.display = isCollapsed ? 'block' : 'none';
				header.classList.toggle('collapsed', !isCollapsed);
				if (icon) {
					icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
				}
			}
		});
	});
}

export function setupTabs() {
	const tabBtns = document.querySelectorAll('.tab-btn');
	
	tabBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			const parent = btn.closest('.panel-body');
			if (!parent) return;

			parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
			parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
			
			btn.classList.add('active');
			const tabId = `tab-${btn.dataset.tab}`;
			const target = document.getElementById(tabId);
			if (target) {
				target.classList.add('active');
			}
		});
	});
}

export function setupOutputInteraction() {
	output.addEventListener('click', (e) => {
		const span = e.target.closest('.tikz-number');
		if (!span) return;

		const originalValue = span.textContent;
		const input = document.createElement('input');
		input.type = 'number';
		input.className = 'tikz-input';
		input.value = originalValue;
		input.step = 0.01;
		input.style.width = `${(originalValue.length + 2) * 8}px`;
		input.style.textAlign = 'center';

		span.replaceWith(input);
		input.focus();
		input.select();

		const finishEditing = (applyChanges) => {
			if (applyChanges) {
				const shapeId = parseInt(span.dataset.shapeId, 10);
				const property = span.dataset.property;
				const isY = span.dataset.isY === 'true';
				const newValue = input.value;

				const shape = app.shapes.find(s => s.id === shapeId);
				if (shape) {
					const pxValue = tikzToPx(newValue, isY);
					const scalarValue = tikzToPx(newValue, false);

					switch (property) {
						case 'radius':
						case 'length': {
							const dx = shape.x2 - shape.x1;
							const dy = shape.y2 - shape.y1;
							const angle = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx);
							shape.x2 = shape.x1 + scalarValue * Math.cos(angle);
							shape.y2 = shape.y1 + scalarValue * Math.sin(angle);
							if (property === 'radius' && shape.radius !== undefined) {
								shape.radius = scalarValue;
							}
							break;
						}
						case 'width': {
							const w = scalarValue;
							const cx = (shape.x1 + shape.x2) / 2;
							shape.x1 = cx - w / 2;
							shape.x2 = cx + w / 2;
							break;
						}
						case 'height': {
							const h = scalarValue;
							const cy = (shape.y1 + shape.y2) / 2;
							shape.y1 = cy - h / 2;
							shape.y2 = cy + h / 2;
							break;
						}
						case 'cx': {
							const w = shape.x2 - shape.x1;
							shape.x1 = pxValue - w / 2;
							shape.x2 = pxValue + w / 2;
							if (shape.cp1x !== undefined) {
								const dcx = pxValue - ((shape.x1 + shape.x2) / 2);
								shape.cp1x += dcx;
								shape.cp2x += dcx;
							}
							break;
						}
						case 'cy': {
							const h = Math.abs(shape.y2 - shape.y1);
							shape.y1 = pxValue - h / 2;
							shape.y2 = pxValue + h / 2;
							if (shape.cp1y !== undefined) {
								const dcy = pxValue - ((shape.y1 + shape.y2) / 2);
								shape.cp1y += dcy;
								shape.cp2y += dcy;
							}
							break;
						}
						case 'rx':
							shape.x2 = shape.x1 + scalarValue;
							break;
						case 'ry':
							shape.y2 = shape.y1 + scalarValue;
							break;
						default:
							if (property.startsWith('points.')) {
								const parts = property.split('.');
								const index = parseInt(parts[1], 10);
								const coord = parts[2];
								if (shape.points && shape.points[index]) {
									shape.points[index][coord] = pxValue;
								}
							} else {
								shape[property] = pxValue;
							}
							break;
					}

					render();
					generateCode();
					pushState();
					updateUIFromShape(shape);
				}
			} else {
				input.replaceWith(span);
			}
		};

		input.addEventListener('blur', () => finishEditing(true));
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				finishEditing(true);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				finishEditing(false);
			}
		});
	});
}

export function setupTextEditing() {
	const textEditor = document.getElementById('text-editor');
	let editingShape = null;

	const finishEditing = (save) => {
		if (!editingShape) return;
		
		if (save) {
			editingShape.style.text = textEditor.value;
			generateCode();
			pushState();
			render();
			updateUIFromShape(editingShape);
		}
		
		textEditor.style.display = 'none';
		textEditor.style.transform = 'none';
		editingShape = null;
	};

	canvas.addEventListener('dblclick', (e) => {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape && shape.type === 'text') {
			editingShape = shape;
			
			const screenPos = worldToScreen(shape.x1, shape.y1);
			const style = shape.style;
			
			const sizeMap = {
				'tiny': 8, 'scriptsize': 10, 'footnotesize': 12, 'small': 13,
				'normalsize': 16, 'large': 18, 'Large': 22, 'LARGE': 26, 'huge': 30, 'Huge': 36
			};
			const fontMap = { 'serif': 'serif', 'sans': 'sans-serif', 'mono': 'monospace' };

			const fontSize = (sizeMap[style.textSize] || 16) * app.view.scale;
			
			textEditor.value = style.text || '';
			textEditor.style.display = 'block';
			textEditor.style.fontSize = `${fontSize}px`;
			textEditor.style.fontFamily = fontMap[style.textFont] || 'sans-serif';
			textEditor.style.fontWeight = style.textWeight === 'bfseries' ? 'bold' : 'normal';
			textEditor.style.fontStyle = style.textSlant === 'itshape' ? 'italic' : 'normal';
			textEditor.style.color = style.stroke || '#000000';

			const lines = textEditor.value.split('\\\\');
			const lineHeight = fontSize * 1.2;
			textEditor.style.height = `${lines.length * lineHeight + 4}px`;
			textEditor.style.width = 'auto';
			
			const tempCtx = canvas.getContext('2d');
			tempCtx.font = `${textEditor.style.fontStyle} ${textEditor.style.fontWeight} ${fontSize}px ${textEditor.style.fontFamily}`;
			let maxWidth = 0;
			lines.forEach(line => {
				maxWidth = Math.max(maxWidth, tempCtx.measureText(line).width);
			});
			textEditor.style.width = `${maxWidth + 20}px`;

			textEditor.style.left = `${screenPos.x - textEditor.offsetWidth / 2}px`;
			textEditor.style.top = `${screenPos.y - textEditor.offsetHeight / 2}px`;

			if (style.textRotate) {
				textEditor.style.transform = `rotate(${style.textRotate}deg)`;
				textEditor.style.transformOrigin = 'center center';
			} else if (style.rotate) {
				textEditor.style.transform = `rotate(${style.rotate}deg)`;
				textEditor.style.transformOrigin = 'center center';
			}

			textEditor.focus();
			textEditor.select();
		}
	});

	textEditor.addEventListener('blur', () => finishEditing(true));
	textEditor.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			finishEditing(true);
		} else if (e.key === 'Escape') {
			finishEditing(false);
		}
	});
}

export function updateUndoRedoUI() {
	document.getElementById('undoBtn').disabled = app.historyIndex <= 0;
	document.getElementById('redoBtn').disabled = app.historyIndex >= app.history.length - 1;
}