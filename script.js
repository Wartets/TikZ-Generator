const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');
const coordsDisplay = document.getElementById('coords');

function generateInitialState() {
	const state = {};
	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const prop = config.propName || key;
		
		if (config.type === 'color-checkbox') {
			const isEnabled = config.enabledByDefault;
			state.hasFill = isEnabled;
			state[prop] = isEnabled ? config.defaultValue : null;
		} else {
			state[prop] = config.defaultValue;
		}
	}
	return state;
}

const initialState = generateInitialState();

const app = {
	shapes: [],
	history: [],
	historyIndex: -1,
	currentShape: null,
	selectedShape: null,
	activeTool: null,
	drawingStyle: {},
	colors: new Map(),
	toolManager: {}
};

function getHandleAtPos(shape, x, y) {
	if (!shape) return null;
	const handles = ShapeManager[shape.type].getHandles(shape);
	for (const h of handles) {
		if (Math.abs(x - h.x) <= UI_CONSTANTS.HANDLE_HIT_RADIUS && Math.abs(y - h.y) <= UI_CONSTANTS.HANDLE_HIT_RADIUS) {
			return h;
		}
	}
	return null;
}

class BaseTool {
	onMouseDown(e) {}
	onMouseMove(e) {}
	onMouseUp(e) {}
	onActivate() {}
	onDeactivate() {}
}

class DrawingTool extends BaseTool {
	constructor(shapeType) {
		super();
		this.shapeType = shapeType;
		this.startX = 0;
		this.startY = 0;
		this.config = TOOL_CONFIG[shapeType];
		this.mode = 'drawing'; 
		this.editHandle = null;
		this.step = 0;
	}

	onMouseDown(e) {
		const p = getPos(e);
		
		if (app.selectedShape) {
			const handle = getHandleAtPos(app.selectedShape, p.x, p.y);
			if (handle) {
				this.mode = 'editing';
				this.editHandle = handle.pos;
				return;
			}
		}

		if (this.mode !== 'drawing' || !app.currentShape) {
			this.mode = 'drawing';
			app.selectedShape = null;
			this.startX = p.x;
			this.startY = p.y;
			this.step = 0;
			const shapeDef = ShapeManager[this.shapeType];
			if (shapeDef && shapeDef.onDown) {
				app.currentShape = shapeDef.onDown(p.x, p.y, app.drawingStyle);
			}
		}
		render();
	}

	onMouseMove(e) {
		const p = getPos(e);

		if (this.mode === 'editing' && app.selectedShape) {
			ShapeManager[app.selectedShape.type].resize(app.selectedShape, p.x, p.y, this.editHandle);
			render();
			return;
		}

		if (this.mode === 'drawing' && app.currentShape) {
			const shapeDef = ShapeManager[this.shapeType];
			if (shapeDef && shapeDef.onDrag) {
				shapeDef.onDrag(app.currentShape, p.x, p.y, this.step);
			}
			render();
			return;
		}

		if (app.selectedShape) {
			const handle = getHandleAtPos(app.selectedShape, p.x, p.y);
			if (handle) {
				canvas.style.cursor = handle.cursor || 'pointer';
			} else {
				canvas.style.cursor = this.config.cursor || 'crosshair';
			}
		} else {
			canvas.style.cursor = this.config.cursor || 'crosshair';
		}
	}

	onMouseUp() {
		if (this.mode === 'editing') {
			this.mode = 'drawing';
			this.editHandle = null;
			generateCode();
			pushState();
			return;
		}

		if (!app.currentShape) return;
		
		const shapeDef = ShapeManager[this.shapeType];
		
		if (shapeDef.onNextStep) {
			const isFinished = shapeDef.onNextStep(app.currentShape, this.step);
			if (!isFinished) {
				this.step++;
				return;
			}
		} else {
			if (Math.abs(this.startX - app.currentShape.x2) < 2 && Math.abs(this.startY - app.currentShape.y2) < 2) {
				app.currentShape = null;
				render();
				return;
			}
		}

		app.shapes.push(app.currentShape);
		app.selectedShape = app.currentShape;
		
		pushState();
		generateCode();
		
		app.currentShape = null;
		this.step = 0;
		render();
	}

	onActivate() {
		app.selectedShape = null;
		app.currentShape = null;
		this.step = 0;
		canvas.style.cursor = this.config.cursor || 'crosshair';
		render();
	}
}

class SelectTool extends BaseTool {
	constructor() {
		super();
		this.mode = 'idle';
		this.handle = null;
		this.dragOffsetX = 0;
		this.dragOffsetY = 0;
		this.config = TOOL_CONFIG['select'];
	}

	onMouseDown(e) {
		const p = getPos(e);
		if (app.selectedShape) {
			const handle = getHandleAtPos(app.selectedShape, p.x, p.y);
			if (handle) {
				this.mode = 'resizing';
				this.handle = handle.pos;
				document.body.style.cursor = handle.cursor;
				return;
			}
		}

		const shape = getShapeAtPos(p.x, p.y);
		app.selectedShape = shape;
		if (shape) {
			this.mode = 'moving';
			const box = ShapeManager[shape.type].getBoundingBox(shape);
			this.dragOffsetX = p.x - box.minX;
			this.dragOffsetY = p.y - box.minY;
			updateUIFromShape(shape);
			updateSettingsVisibility('select', shape.type);
		} else {
			updateSettingsVisibility('select');
		}
		render();
	}
	
	onMouseMove(e) {
		const p = getPos(e);
		if (this.mode === 'moving' && app.selectedShape) {
			const box = ShapeManager[app.selectedShape.type].getBoundingBox(app.selectedShape);
			const dx = (p.x - this.dragOffsetX) - box.minX;
			const dy = (p.y - this.dragOffsetY) - box.minY;
			ShapeManager[app.selectedShape.type].move(app.selectedShape, dx, dy);
			render();
		} else if (this.mode === 'resizing' && app.selectedShape) {
			ShapeManager[app.selectedShape.type].resize(app.selectedShape, p.x, p.y, this.handle);
			render();
		} else {
			this.updateCursor(p);
		}
	}

	onMouseUp() {
		if (this.mode === 'moving' || this.mode === 'resizing') {
			generateCode();
			pushState();
		}
		this.mode = 'idle';
		this.handle = null;
		document.body.style.cursor = 'default';
		this.updateCursor(getPos({ clientX: -1, clientY: -1, shiftKey: true }));
	}

	updateCursor(p) {
		let cursor = this.config.cursor || 'default';
		if (app.selectedShape) {
			const handle = getHandleAtPos(app.selectedShape, p.x, p.y);
			if (handle) {
				cursor = handle.cursor;
			}
		}
		if (cursor === (this.config.cursor || 'default') && getShapeAtPos(p.x, p.y)) {
			cursor = 'move';
		}
		canvas.style.cursor = cursor;
	}

	onActivate() {
		canvas.style.cursor = this.config.cursor || 'default';
	}
	
	onDeactivate() {
		app.selectedShape = null;
		render();
	}
}

class DuplicateTool extends BaseTool {
	constructor() {
		super();
		this.config = TOOL_CONFIG['duplicate'];
	}

	onMouseDown(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape) {
			const newShape = JSON.parse(JSON.stringify(shape));
			const offset = UI_CONSTANTS.GRID_SIZE;
			
			newShape.x1 += offset;
			newShape.y1 += offset;
			newShape.x2 += offset;
			newShape.y2 += offset;
			
			if (newShape.type === 'triangle') {
				newShape.x3 += offset;
				newShape.y3 += offset;
			} else if (newShape.type === 'curve') {
				newShape.cp1x += offset;
				newShape.cp1y += offset;
				newShape.cp2x += offset;
				newShape.cp2y += offset;
			}

			app.shapes.push(newShape);
			app.selectedShape = newShape;
			
			generateCode();
			pushState();
			render();
			
			setTool('select');
		}
	}

	onMouseMove(e) {
		const p = getPos(e);
		if (getShapeAtPos(p.x, p.y)) {
			canvas.style.cursor = 'copy';
		} else {
			canvas.style.cursor = 'default';
		}
	}

	onActivate() {
		canvas.style.cursor = 'default';
		app.selectedShape = null;
		render();
	}
}

class DeleteTool extends BaseTool {
	constructor() {
		super();
		this.config = TOOL_CONFIG['delete'];
	}

	onMouseDown(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape) {
			const index = app.shapes.indexOf(shape);
			if (index > -1) {
				app.shapes.splice(index, 1);
				app.selectedShape = null;
				generateCode();
				pushState();
				render();
			}
		}
	}

	onMouseMove(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape) {
			canvas.style.cursor = 'pointer';
			this.highlightShape(shape);
		} else {
			canvas.style.cursor = 'not-allowed';
			render(); 
		}
	}

	highlightShape(shape) {
		render();
		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.strokeStyle = '#ff4757';
		ctx.lineWidth = 2;
		
		const shapeDef = ShapeManager[shape.type];
		if (shapeDef && shapeDef.render) {
			shapeDef.render(shape, ctx);
		}
		
		ctx.restore();
	}

	onActivate() {
		canvas.style.cursor = 'not-allowed';
		app.selectedShape = null;
		render();
	}
}

class RaiseTool extends BaseTool {
	constructor() {
		super();
		this.config = TOOL_CONFIG['raise'];
	}

	onMouseDown(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape) {
			const index = app.shapes.indexOf(shape);
			if (index < app.shapes.length - 1) {
				app.shapes.splice(index, 1);
				if (e.shiftKey) {
					app.shapes.splice(index + 1, 0, shape);
				} else {
					app.shapes.push(shape);
				}
				app.selectedShape = shape;
				generateCode();
				pushState();
				render();
				this.highlightShape(shape);
			}
		}
	}

	onMouseMove(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		render();
		
		if (shape) {
			canvas.style.cursor = 'n-resize';
			this.highlightShape(shape);
			const action = e.shiftKey ? "Monter d'un niveau" : "Mettre au premier plan";
			coordsDisplay.textContent = `${action} (Shift+Clic pour alterner)`;
		} else {
			canvas.style.cursor = 'default';
		}
	}

	highlightShape(shape) {
		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.strokeStyle = '#fa8231';
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 4]);
		
		const shapeDef = ShapeManager[shape.type];
		if (shapeDef) {
			const box = shapeDef.getBoundingBox(shape);
			const padding = 6;
			ctx.strokeRect(
				box.minX - padding, 
				box.minY - padding, 
				box.maxX - box.minX + (padding * 2), 
				box.maxY - box.minY + (padding * 2)
			);
		}
		
		ctx.restore();
	}

	onActivate() {
		canvas.style.cursor = 'default';
		app.selectedShape = null;
		render();
	}
}

class LowerTool extends BaseTool {
	constructor() {
		super();
		this.config = TOOL_CONFIG['lower'];
	}

	onMouseDown(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape) {
			const index = app.shapes.indexOf(shape);
			if (index > 0) {
				app.shapes.splice(index, 1);
				if (e.shiftKey) {
					app.shapes.splice(index - 1, 0, shape);
				} else {
					app.shapes.unshift(shape);
				}
				app.selectedShape = shape;
				generateCode();
				pushState();
				render();
				this.highlightShape(shape);
			}
		}
	}

	onMouseMove(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		render();
		
		if (shape) {
			canvas.style.cursor = 's-resize';
			this.highlightShape(shape);
			const action = e.shiftKey ? "Descendre d'un niveau" : "Mettre à l'arrière plan";
			coordsDisplay.textContent = `${action} (Shift+Clic pour alterner)`;
		} else {
			canvas.style.cursor = 'default';
		}
	}

	highlightShape(shape) {
		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.strokeStyle = '#fa8231';
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 4]);
		
		const shapeDef = ShapeManager[shape.type];
		if (shapeDef) {
			const box = shapeDef.getBoundingBox(shape);
			const padding = 6;
			ctx.strokeRect(
				box.minX - padding, 
				box.minY - padding, 
				box.maxX - box.minX + (padding * 2), 
				box.maxY - box.minY + (padding * 2)
			);
		}
		
		ctx.restore();
	}

	onActivate() {
		canvas.style.cursor = 'default';
		app.selectedShape = null;
		render();
	}
}

let currentState = { ...initialState };

function createToolsUI() {
	const containers = {
		general: document.getElementById('tools-general'),
		drawing: document.getElementById('tools-drawing'),
		circuits: document.getElementById('tools-circuits'),
		optics: document.getElementById('tools-optics'),
		logic: document.getElementById('tools-logic'),
		flowchart: document.getElementById('tools-flowchart')
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

function createSettingsUI() {
	const container = document.getElementById('settings-container');
	container.innerHTML = '';
	const settingsGroups = {};

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const groupName = config.group || `group-${key}`;

		if (!settingsGroups[groupName]) {
			settingsGroups[groupName] = {
				configs: [],
				options: config.groupOptions || {}
			};
		}
		settingsGroups[groupName].configs.push({ key, ...config });
	}

	for (const groupName in settingsGroups) {
		const groupInfo = settingsGroups[groupName];
		const groupContainer = document.createElement('div');
		
		if (groupInfo.options.type === 'row') {
			groupContainer.className = 'control-row';
		} else {
			groupContainer.className = 'control-group-wrapper';
		}

		groupInfo.configs.forEach(config => {
			const key = config.key;
			const controlWrapper = document.createElement('div');
			controlWrapper.className = 'control-group';
			controlWrapper.id = `wrapper-${key}`;
			let controlHtml = '';

			switch (config.type) {
				case 'textarea':
					controlHtml = `
						<label>${config.label}</label>
						<textarea id="${key}" data-setting="${key}" class="settings-input"></textarea>`;
					break;
				case 'select':
					controlHtml = `
						<label>${config.label}</label>
						<select id="${key}" data-setting="${key}">
							${Object.entries(config.options).map(([val, text]) => `<option value="${val}">${text}</option>`).join('')}
						</select>`;
					break;
				case 'range':
					const isPercent = config.unit === '%';
					const displayValue = isPercent ? `${config.defaultValue * 100}${config.unit}` : `${config.defaultValue}${config.unit}`;
					controlHtml = `
						<div class="slider-row">
							<label>${config.label}</label>
							<span id="${key}Value">${displayValue}</span>
						</div>
						<input type="range" id="${key}" data-setting="${key}" min="${config.min}" max="${config.max}" step="${config.step}">`;
					break;
				case 'checkbox':
					controlHtml = `
						<div class="slider-row" style="justify-content: flex-start; gap: 10px;">
							<input type="checkbox" id="${key}" data-setting="${key}" style="width: auto;">
							<label style="margin: 0; cursor: pointer;" for="${key}">${config.label}</label>
						</div>`;
					break;
				case 'color':
					controlHtml = `
						<div class="color-input">
							<label>${config.label}</label>
							<input type="color" id="${key}" data-setting="${key}">
						</div>`;
					 controlWrapper.style.flex = '1';
					break;
				case 'color-checkbox':
					controlHtml = `
						<div class="color-input">
							<label>${config.label}</label>
							<div class="fill-toggle">
								<input type="color" id="${key}" data-setting="${key}">
								<input type="checkbox" id="hasFill" data-setting="hasFill">
							</div>
						</div>`;
					 controlWrapper.style.flex = '1';
					break;
			}
			controlWrapper.innerHTML = controlHtml;
			groupContainer.appendChild(controlWrapper);
		});
		container.appendChild(groupContainer);
	}
}

function createGlobalSettingsUI() {
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
		}
		
		wrapper.innerHTML = html;
		container.appendChild(wrapper);
	}
}

function updateSettingsVisibility(toolName, shapeType = null) {
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
	let hasVisibleSettings = false;

	for (const key in SETTINGS_CONFIG) {
		const wrapper = document.getElementById(`wrapper-${key}`);
		if (wrapper) {
			let isVisible = allowed.includes(key);

			if ((key === 'arrowHead' || key === 'arrowScale') && !arrowEnabled) {
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

function resizeCanvas() {
	const container = canvas.parentElement;
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
	render();
}

function setTool(toolName) {
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
}

function updateSetting(element) {
	const key = element.dataset.setting || element.dataset.global;
	const isGlobal = !!element.dataset.global;

	if (key === 'hasFill') {
		const value = element.checked;
		const fillColorInput = document.getElementById('fillColor');
		fillColorInput.style.opacity = value ? '1' : '0.2';
		fillColorInput.style.pointerEvents = value ? 'auto' : 'none';
		fillColorInput.disabled = !value;
		const targetFill = app.selectedShape ? app.selectedShape.style : app.drawingStyle;
		if (!value) targetFill.fill = null;
		else targetFill.fill = fillColorInput.value;

		if (app.selectedShape) {
			render();
			generateCode();
			pushState();
		}
		saveToLocalStorage();
		return;
	}

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
	const target = (app.selectedShape && !isGlobal) ? app.selectedShape.style : app.drawingStyle;
	target[propName] = value;

	if (config.type === 'range') {
		const valueSpan = document.getElementById(`${key}Value`);
		if (valueSpan) {
			const unit = config.unit || '';
			valueSpan.textContent = key === 'opacity' ? `${Math.round(value * 100)}%` : `${value}${unit}`;
		}
	}

	if (key === 'canvasZoom') {
		canvas.parentElement.style.setProperty('--grid-size', `${value}px`);
	}

	if (key === 'stageColor') {
		canvas.parentElement.style.backgroundColor = value;
	}

	if (key === 'arrowStyle') {
		const toolName = app.activeTool === app.toolManager.select ? 'select' : (app.activeTool.shapeType || 'select');
		const shapeType = app.selectedShape ? app.selectedShape.type : null;
		updateSettingsVisibility(toolName, shapeType);
	}

	render();
	generateCode();
	if (app.selectedShape || isGlobal) {
		pushState();
	}
	saveToLocalStorage();
}

function snap(val) {
	return Math.round(val / UI_CONSTANTS.GRID_SIZE) * UI_CONSTANTS.GRID_SIZE;
}

function getPos(e) {
	const rect = canvas.getBoundingClientRect();
	let x = e.clientX - rect.left;
	let y = e.clientY - rect.top;
	if (!e.shiftKey) {
		x = snap(x);
		y = snap(y);
	}
	return { x, y };
}

function drawArrow(ctx, x, y, angle, headType, scale, lineWidth) {
	if (!headType) headType = 'stealth';
	scale = scale || 1;
	
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.scale(scale, scale);
	
	ctx.beginPath();
	ctx.lineWidth = lineWidth;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	const s = 10; 

	if (headType === 'stealth') {
		ctx.moveTo(-s, -s * 0.4);
		ctx.lineTo(0, 0);
		ctx.lineTo(-s, s * 0.4);
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'latex') {
		ctx.moveTo(-s * 1.2, 0);
		ctx.quadraticCurveTo(-s * 0.5, 0, 0, 0);
		ctx.quadraticCurveTo(-s * 0.5, 0, -s * 1.2, -s * 0.5);
		ctx.lineTo(-s * 1.2, s * 0.5);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'triangle 45') {
		ctx.moveTo(-s, -s * 0.5);
		ctx.lineTo(0, 0);
		ctx.lineTo(-s, s * 0.5);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'to') {
		ctx.moveTo(-s * 1.2, -s * 0.5);
		ctx.quadraticCurveTo(-s * 0.4, 0, 0, 0);
		ctx.quadraticCurveTo(-s * 0.4, 0, -s * 1.2, s * 0.5);
		ctx.stroke();
	} else if (headType === 'circle') {
		ctx.arc(-s/2, 0, s/2, 0, Math.PI * 2);
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'diamond') {
		ctx.moveTo(-s, 0);
		ctx.lineTo(-s/2, -s/3);
		ctx.lineTo(0, 0);
		ctx.lineTo(-s/2, s/3);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	}

	ctx.restore();
}

function renderShape(s, ctx) {
	ctx.save();
	ctx.beginPath();

	ctx.lineWidth = s.style.width;
	ctx.strokeStyle = s.style.stroke;
	ctx.fillStyle = s.style.fill || 'transparent';
	ctx.globalAlpha = s.style.opacity;

	let dash = [];
	if (s.style.dash === 'dashed') dash = [5, 5];
	else if (s.style.dash === 'dotted') dash = [2, 2];
	else if (s.style.dash === 'densely dashed') dash = [3, 2];
	ctx.setLineDash(dash);

	if (s.style.double) {
		ctx.lineWidth = s.style.width * 3;
		const oldStroke = ctx.strokeStyle;
		
		const shapeDef = ShapeManager[s.type];
		if (shapeDef && shapeDef.render && s.type !== 'text') {
			shapeDef.render(s, ctx);
		}
		
		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineWidth = s.style.width;
		ctx.strokeStyle = 'rgba(0,0,0,1)';
		
		if (shapeDef && shapeDef.render && s.type !== 'text') {
			ctx.beginPath();
			shapeDef.render(s, ctx);
		}
		
		ctx.globalCompositeOperation = 'source-over';
		ctx.strokeStyle = oldStroke;
		ctx.lineWidth = s.style.width; 
	}
	
	const shapeDef = ShapeManager[s.type];
	if (shapeDef && shapeDef.render) {
		shapeDef.render(s, ctx);
	}
	
	if (s.style.arrow && s.style.arrow !== 'none' && (s.type === 'line' || s.type === 'curve' || s.type === 'arc' || s.type === 'axes' || s.type === 'wave')) {
		ctx.setLineDash([]);
		let angEnd, angStart;
		let startX, startY, endX, endY;
		
		if (s.type === 'curve') {
			angEnd = Math.atan2(s.y2 - s.cp2y, s.x2 - s.cp2x);
			angStart = Math.atan2(s.y1 - s.cp1y, s.x1 - s.cp1x);
			startX = s.x1; startY = s.y1;
			endX = s.x2; endY = s.y2;
		} else if (s.type === 'arc') {
			 const r = s.radius;
			 const endAngle = s.endAngle;
			 const startAngle = s.startAngle;
			 
			 endX = s.x1 + r * Math.cos(endAngle);
			 endY = s.y1 + r * Math.sin(endAngle);
			 startX = s.x1 + r * Math.cos(startAngle);
			 startY = s.y1 + r * Math.sin(startAngle);

			 angEnd = endAngle + Math.PI/2;
			 angStart = startAngle - Math.PI/2;
			 
			 angEnd = endAngle + Math.PI/2;
			 angStart = startAngle - Math.PI/2;
			 
			 angEnd = Math.atan2(Math.cos(endAngle), -Math.sin(endAngle)); 
			 angStart = Math.atan2(-Math.cos(startAngle), Math.sin(startAngle)); 
		} else { 
			angEnd = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
			angStart = angEnd + Math.PI;
			startX = s.x1; startY = s.y1;
			endX = s.x2; endY = s.y2;
		}

		const head = s.style.arrowHead || 'stealth';
		const scale = s.style.arrowScale || 1;

		if (s.style.arrow === '->' || s.style.arrow === '<->' || s.style.arrow === '-stealth' || s.style.arrow === '-latex') {
			 if (s.type === 'arc') angEnd = s.endAngle + Math.PI / 2;
			 drawArrow(ctx, endX, endY, angEnd, head, scale, s.style.width);
		}
		if (s.style.arrow === '<-' || s.style.arrow === '<->') {
			 if (s.type === 'arc') angStart = s.startAngle - Math.PI / 2;
			 drawArrow(ctx, startX, startY, angStart, head, scale, s.style.width);
		}
	}

	ctx.restore();
}

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	ctx.save();
	ctx.strokeStyle = UI_CONSTANTS.AXIS_HELPER_COLOR;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, canvas.height - 0.5);
	ctx.lineTo(canvas.width, canvas.height - 0.5);
	ctx.moveTo(0.5, 0);
	ctx.lineTo(0.5, canvas.height);
	ctx.stroke();
	ctx.restore();

	app.shapes.forEach(s => renderShape(s, ctx));
	if (app.currentShape) renderShape(app.currentShape, ctx);
	if (app.selectedShape) drawSelection(app.selectedShape, ctx);
}

function buildTikzOptions(s) {
	let opts = [];
	const style = s.style;

	if (style.arrow && style.arrow !== 'none') {
		const head = style.arrowHead ? style.arrowHead.charAt(0).toUpperCase() + style.arrowHead.slice(1) : 'Stealth';
		const scale = style.arrowScale || 1;
		let headStr = head === 'Triangle 45' ? 'Triangle[angle=45:1pt]' : (head === 'To' ? 'To' : head);
		opts.push(scale !== 1 ? `>={${headStr}[scale=${scale}]}` : `>={${headStr}}`);
	}

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		if (config.excludeFrom && config.excludeFrom.includes(s.type)) continue;
		if (['arrowHead', 'arrowScale', 'textWeight', 'textSlant', 'textFont'].includes(key)) continue;

		const prop = config.propName || key;
		const val = style[prop];
		
		if (config.tikzValue) {
			const processedVal = config.tikzValue(val);
			if (processedVal !== null) {
				if (config.isColor) {
					const colorName = app.colors.get(processedVal);
					opts.push(`${config.tikzKey}=${colorName || processedVal}`);
				} else if (config.tikzKey) {
					const suffix = config.tikzSuffix || '';
					opts.push(`${config.tikzKey}=${processedVal}${suffix}`);
				} else {
					opts.push(processedVal);
				}
			}
		}
	}
	
	return opts.length ? `[${opts.join(', ')}]` : '';
}

function generateCode() {
	let out = "";
	const useFigure = app.drawingStyle.figCaption || app.drawingStyle.figLabel;
	const tikzOpts = [];
	
	if (app.drawingStyle.figScale && app.drawingStyle.figScale !== 1) {
		tikzOpts.push(`scale=${app.drawingStyle.figScale}`);
	}

	if (useFigure) {
		out += "\\begin{figure}[htbp]\n	\\centering\n";
	}

	out += "\\begin{tikzpicture}";
	if (tikzOpts.length > 0) out += `[${tikzOpts.join(', ')}]`;
	out += "\n";

	app.colors.clear();
	const usedColors = new Set();
	app.shapes.forEach(s => {
		if (s.style.stroke) usedColors.add(s.style.stroke.toUpperCase());
		if (s.style.fill) usedColors.add(s.style.fill.toUpperCase());
	});

	let cIdx = 1;
	usedColors.forEach(hex => {
		if (hex !== '#000000' && hex !== '#FFFFFF') {
			const name = 'c' + cIdx++;
			app.colors.set(hex, name);
			app.colors.set(hex.toLowerCase(), name);
			out += `	\\definecolor{${name}}{HTML}{${hex.substring(1)}}\n`;
		}
	});
	
	if (app.colors.size) out += "\n";

	app.shapes.forEach(s => {
		const shapeDef = ShapeManager[s.type];
		if (!shapeDef || !shapeDef.toTikZ) return;
		
		const optStr = buildTikzOptions(s);
		if (s.type === 'text') {
			out += `	\\node${optStr} at ${shapeDef.toTikZ(s)}\n`;
		} else if (shapeDef.isStandaloneCommand) {
			out += `	${shapeDef.toTikZ(s, optStr)}\n`;
		} else {
			out += `	\\draw${optStr} ${shapeDef.toTikZ(s)}\n`;
		}
	});

	out += "\\end{tikzpicture}";

	if (useFigure) {
		if (app.drawingStyle.figCaption) {
			out += `\n	\\caption{${app.drawingStyle.figCaption}}`;
		}
		if (app.drawingStyle.figLabel) {
			out += `\n	\\label{${app.drawingStyle.figLabel}}`;
		}
		out += "\n\\end{figure}";
	}
	
	output.textContent = out;
	if (window.Prism) {
		Prism.highlightElement(output);
	}
}

function onMouseDown(e) {
	if (app.activeTool && app.activeTool.onMouseDown) {
		app.activeTool.onMouseDown(e);
	}
}

function onMouseMove(e) {
	const p = getPos(e);
	coordsDisplay.textContent = `x: ${toTikZ(p.x)}, y: ${toTikZ(p.y, true)}`;
	if (app.activeTool && app.activeTool.onMouseMove) {
		app.activeTool.onMouseMove(e);
	}
}

function onMouseUp(e) {
	if (app.activeTool && app.activeTool.onMouseUp) {
		app.activeTool.onMouseUp(e);
	}
}

function clearAll() {
	app.shapes = [];
	app.selectedShape = null;
	app.history = [];
	app.historyIndex = -1;
	pushState();
	render();
	generateCode();
	saveToLocalStorage();
}

function updateUndoRedoUI() {
	document.getElementById('undoBtn').disabled = app.historyIndex <= 0;
	document.getElementById('redoBtn').disabled = app.historyIndex >= app.history.length - 1;
}

function pushState() {
	app.history = app.history.slice(0, app.historyIndex + 1);
	app.history.push(JSON.stringify(app.shapes));
	app.historyIndex++;
	updateUndoRedoUI();
	saveToLocalStorage();
}

function undo() {
	if (app.historyIndex > 0) {
		app.historyIndex--;
		app.shapes = JSON.parse(app.history[app.historyIndex]);
		app.selectedShape = null;
		render();
		generateCode();
		updateUndoRedoUI();
		saveToLocalStorage();
	}
}

function redo() {
	if (app.historyIndex < app.history.length - 1) {
		app.historyIndex++;
		app.shapes = JSON.parse(app.history[app.historyIndex]);
		app.selectedShape = null;
		render();
		generateCode();
		updateUndoRedoUI();
		saveToLocalStorage();
	}
}

function getShapeAtPos(x, y) {
	for (let i = app.shapes.length - 1; i >= 0; i--) {
		const s = app.shapes[i];
		if (ShapeManager[s.type].hitTest(s, x, y)) {
			return s;
		}
	}
	return null;
}

function updateUIFromShape(s) {
	if (!s) return;
	
	const style = s.style;
	const fields = [
		'strokeColor', 'lineWidth', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale',
		'opacity', 'textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 
		'textRotate', 'textAnchor', 'textAlign', 'textWidth', 'gridStep',
		'polySides', 'starPoints', 'starRatio'
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

	const checkboxes = ['hasFill', 'doubleLine'];
	checkboxes.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			if (id === 'hasFill') el.checked = !!style.fill;
			else if (id === 'doubleLine') el.checked = !!style.double;
		}
	});
	
	const fillColorInput = document.getElementById('fillColor');
	if (fillColorInput) {
		fillColorInput.value = style.fill || SETTINGS_CONFIG.fillColor.defaultValue;
		fillColorInput.style.opacity = style.fill ? '1' : '0.2';
		fillColorInput.style.pointerEvents = style.fill ? 'auto' : 'none';
		fillColorInput.disabled = !style.fill;
	}

	updateSettingsVisibility('select', s.type);
}

function getHandles(s) {
	const minX = Math.min(s.x1, s.x2);
	const maxX = Math.max(s.x1, s.x2);
	const minY = Math.min(s.y1, s.y2);
	const maxY = Math.max(s.y1, s.y2);
	const cx = (minX + maxX) / 2;
	const cy = (minY + maxY) / 2;
	
	return [
		{ x: minX, y: minY, pos: 'tl', cursor: 'nwse-resize' },
		{ x: cx,	 y: minY, pos: 'tm', cursor: 'ns-resize' },
		{ x: maxX, y: minY, pos: 'tr', cursor: 'nesw-resize' },
		{ x: maxX, y: cy,	 pos: 'mr', cursor: 'ew-resize' },
		{ x: maxX, y: maxY, pos: 'br', cursor: 'nwse-resize' },
		{ x: cx,	 y: maxY, pos: 'bm', cursor: 'ns-resize' },
		{ x: minX, y: maxY, pos: 'bl', cursor: 'nesw-resize' },
		{ x: minX, y: cy,	 pos: 'ml', cursor: 'ew-resize' },
	];
}

function drawSelection(s, ctx) {
	const shapeDef = ShapeManager[s.type];
	if (!shapeDef) return;

	if (s.type !== 'curve' && s.type !== 'arc' && s.type !== 'line' && s.type !== 'triangle') {
		const box = shapeDef.getBoundingBox(s);
		ctx.save();
		ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 2]);
		ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
		ctx.restore();
	}
	
	const hs = UI_CONSTANTS.HANDLE_SIZE;
	const hs_half = hs / 2;
	
	if (shapeDef.drawHandles) {
		shapeDef.drawHandles(s, ctx);
	}
	
	const handles = shapeDef.getHandles(s);
	handles.forEach(h => {
		if (s.type === 'curve') return; 

		ctx.fillStyle = 'white';
		ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.rect(h.x - hs_half, h.y - hs_half, hs, hs);
		ctx.fill();
		ctx.stroke();
	});
}

function copyToClipboard() {
	const codeText = output.textContent;
	if (navigator.clipboard) {
		navigator.clipboard.writeText(codeText).catch(err => {
			console.error('Could not copy text: ', err);
		});
	} else {
		const tempTextArea = document.createElement('textarea');
		tempTextArea.value = codeText;
		document.body.appendChild(tempTextArea);
		tempTextArea.select();
		document.execCommand('copy');
		document.body.removeChild(tempTextArea);
	}
}

function setupCollapsibles() {
	document.querySelectorAll('.section-title').forEach(title => {
		title.addEventListener('click', () => {
			title.parentElement.classList.toggle('collapsed');
			saveToLocalStorage();
		});
	});
}

function updateUIFromDrawingStyle() {
	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const prop = config.propName || key;
		const val = app.drawingStyle[prop];
		const el = document.getElementById(key);
		
		if (el && val !== undefined) {
			if (config.type === 'checkbox') {
				el.checked = val;
			} else if (config.type === 'color-checkbox') {
				const hasFillCheck = document.getElementById('hasFill');
				const isEnabled = app.drawingStyle.fill !== null;
				if (hasFillCheck) hasFillCheck.checked = isEnabled;
				el.value = app.drawingStyle.fill || config.defaultValue;
				el.style.opacity = isEnabled ? '1' : '0.2';
				el.style.pointerEvents = isEnabled ? 'auto' : 'none';
				el.disabled = !isEnabled;
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

function updateUIFromGlobalSettings() {
	for (const key in GLOBAL_SETTINGS_CONFIG) {
		const config = GLOBAL_SETTINGS_CONFIG[key];
		const el = document.getElementById(key);
		if (el) {
			const val = app.drawingStyle[key];
			if (el.type === 'checkbox') el.checked = val;
			else el.value = val;
			
			if (config.type === 'range') {
				const span = document.getElementById(`${key}Value`);
				if (span) span.textContent = `${val}${config.unit || ''}`;
			}
			if (key === 'canvasZoom') canvas.parentElement.style.setProperty('--grid-size', `${val}px`);
			if (key === 'stageColor') canvas.parentElement.style.backgroundColor = val;
		}
	}
}

function saveToLocalStorage() {
	const uiState = [];
	document.querySelectorAll('.section-wrapper').forEach((wrapper, index) => {
		uiState.push({
			index: index,
			collapsed: wrapper.classList.contains('collapsed')
		});
	});

	const activeToolId = Object.keys(app.toolManager).find(key => app.toolManager[key] === app.activeTool);

	const fullState = {
		shapes: app.shapes,
		history: app.history,
		historyIndex: app.historyIndex,
		drawingStyle: app.drawingStyle,
		activeToolId: activeToolId,
		uiState: uiState
	};
	localStorage.setItem('tikz_generator_data', JSON.stringify(fullState));
}

function loadFromLocalStorage() {
	const data = localStorage.getItem('tikz_generator_data');
	if (!data) return false;

	try {
		const parsed = JSON.parse(data);
		app.history = parsed.history || [];
		app.historyIndex = parsed.historyIndex !== undefined ? parsed.historyIndex : -1;
		
		if (app.historyIndex >= 0 && app.history[app.historyIndex]) {
			app.shapes = JSON.parse(app.history[app.historyIndex]);
		} else {
			app.shapes = parsed.shapes || [];
		}

		app.drawingStyle = { ...app.drawingStyle, ...parsed.drawingStyle };

		if (parsed.uiState) {
			const wrappers = document.querySelectorAll('.section-wrapper');
			parsed.uiState.forEach(ui => {
				if (wrappers[ui.index]) {
					wrappers[ui.index].classList.toggle('collapsed', ui.collapsed);
				}
			});
		}

		updateUIFromGlobalSettings();
		updateUIFromDrawingStyle();
		
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
		return false;
	}
}

function setupTabs() {
	const tabBtns = document.querySelectorAll('.tab-btn');
	
	tabBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			const parent = btn.closest('.section-content');
			parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
			parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
			
			btn.classList.add('active');
			const tabId = `tab-${btn.dataset.tab}`;
			document.getElementById(tabId).classList.add('active');
		});
	});
}

function init() {
	createToolsUI();
	createGlobalSettingsUI();
	createSettingsUI();
	setupCollapsibles();
	setupTabs();

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

	const defaultGlobalState = {};
	for (const key in GLOBAL_SETTINGS_CONFIG) {
		defaultGlobalState[key] = GLOBAL_SETTINGS_CONFIG[key].defaultValue;
	}

	app.drawingStyle = { ...generateInitialState(), ...defaultGlobalState };
	
	const toolHandlers = { DrawingTool, SelectTool, DuplicateTool, DeleteTool, RaiseTool, LowerTool };
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
	window.addEventListener('resize', resizeCanvas);

	resizeCanvas();

	const loaded = loadFromLocalStorage();
	if (!loaded) {
		setTool('select');
		if (app.history.length === 0) pushState();
		render();
		generateCode();
	}
}

document.addEventListener('DOMContentLoaded', init);