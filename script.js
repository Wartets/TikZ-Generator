const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');
const coordsDisplay = document.getElementById('coords');

const TOOL_CONFIG = {
	select: {
		displayName: 'Sélection',
		handler: 'SelectTool',
		icon: '<i class="ti ti-pointer"></i>',
		cursor: 'default',
		group: 'general',
		allow: ['textString', 'textSize', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'gridStep', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	duplicate: {
		displayName: 'Dupliquer',
		handler: 'DuplicateTool',
		icon: '<i class="ti ti-copy"></i>',
		cursor: 'copy',
		group: 'general',
		allow: []
	},
	delete: {
		displayName: 'Supprimer',
		handler: 'DeleteTool',
		icon: '<i class="ti ti-eraser"></i>',
		cursor: 'not-allowed',
		group: 'general',
		allow: []
	},
	raise: {
		displayName: 'Premier plan',
		handler: 'RaiseTool',
		icon: '<i class="ti ti-arrow-bar-to-up"></i>',
		cursor: 'alias',
		group: 'general',
		allow: []
	},
	lower: {
		displayName: 'Arrière plan',
		handler: 'LowerTool',
		icon: '<i class="ti ti-arrow-bar-to-down"></i>',
		cursor: 'alias',
		group: 'general',
		allow: []
	},
	text: {
		displayName: 'Texte',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-text-size">T</i>',
		cursor: 'text',
		group: 'drawing',
		allow: ['textString', 'textSize', 'strokeColor', 'opacity']
	},
	line: {
		displayName: 'Ligne',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-line"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	rect: {
		displayName: 'Rectangle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-rectangle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	circle: {
		displayName: 'Cercle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-circle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	ellipse: {
		displayName: 'Ellipse',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-oval"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	triangle: {
		displayName: 'Triangle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	grid: {
		displayName: 'Grille',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-grid-4x4"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['gridStep', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	axes: {
		displayName: 'Axes',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-axis-arrow"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'lineWidth', 'opacity', 'strokeColor']
	},
	arc: {
		displayName: 'Arc',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-angle-acute"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	curve: {
		displayName: 'Courbe',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-vector-curve"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
};

const SETTINGS_CONFIG = {
	textString: {
		label: 'Contenu',
		type: 'textarea',
		propName: 'text',
		defaultValue: 'Texte',
		tikzValue: (v) => null
	},
	textSize: {
		label: 'Taille',
		type: 'select',
		propName: 'textSize',
		defaultValue: 'normalsize',
		options: {
			'tiny': 'Très petit',
			'scriptsize': 'Petit',
			'normalsize': 'Normal',
			'large': 'Grand',
			'Huge': 'Très grand'
		},
		tikzKey: 'font',
		tikzValue: (v) => v === 'normalsize' ? null : `\\${v}`
	},
	gridStep: {
		label: 'Pas de grille',
		type: 'range',
		propName: 'gridStep',
		defaultValue: 0.5,
		min: 0.1, max: 2, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null
	},
	lineStyle: {
		label: 'Style de trait',
		type: 'select',
		propName: 'dash',
		defaultValue: 'solid',
		options: {
			solid: 'Trait plein',
			dashed: 'Tirets',
			dotted: 'Points',
			'densely dashed': 'Tirets serrés',
		},
		tikzValue: (v) => v === 'solid' ? null : v
	},
	doubleLine: {
		label: 'Double trait',
		type: 'checkbox',
		propName: 'double',
		defaultValue: false,
		tikzKey: 'double',
		tikzValue: (v) => v ? 'true' : null
	},
	arrowStyle: {
		label: 'Direction Flèches',
		type: 'select',
		propName: 'arrow',
		defaultValue: 'none',
		options: {
			none: 'Aucune',
			'->': 'Fin',
			'<-': 'Début',
			'<->': 'Les deux',
		},
		tikzValue: (v) => v === 'none' ? null : v
	},
	arrowHead: {
		label: 'Style de pointe',
		type: 'select',
		propName: 'arrowHead',
		defaultValue: 'stealth',
		options: {
			'stealth': 'Stealth',
			'latex': 'LaTeX',
			'to': 'Standard',
			'triangle 45': 'Triangle',
			'circle': 'Cercle',
			'diamond': 'Losange'
		},
		tikzValue: (v) => null
	},
	arrowScale: {
		label: 'Taille de pointe',
		type: 'range',
		propName: 'arrowScale',
		defaultValue: 1,
		min: 0.5, max: 3, step: 0.1,
		unit: 'x',
		tikzValue: (v) => null
	},
	lineWidth: {
		label: 'Épaisseur',
		type: 'range',
		propName: 'width',
		defaultValue: 1,
		min: 0.1, max: 5, step: 0.1,
		unit: 'pt',
		tikzKey: 'line width',
		tikzSuffix: 'pt',
		tikzValue: (v) => v === 1 ? null : v
	},
	opacity: {
		label: 'Opacité',
		type: 'range',
		propName: 'opacity',
		defaultValue: 1,
		min: 0.1, max: 1, step: 0.1,
		unit: '%',
		tikzKey: 'opacity',
		tikzValue: (v) => v === 1 ? null : v,
		group: 'color-controls'
	},
	strokeColor: {
		label: 'Couleur',
		type: 'color',
		propName: 'stroke',
		defaultValue: '#000000',
		tikzKey: 'draw',
		isColor: true,
		tikzValue: (v) => v === '#000000' ? null : v,
		group: 'color-controls',
		groupOptions: { type: 'row' }
	},
	fillColor: {
		label: 'Remplissage',
		type: 'color-checkbox',
		propName: 'fill',
		defaultValue: '#5e6ad2',
		enabledByDefault: false,
		tikzKey: 'fill',
		isColor: true,
		tikzValue: (v) => v ? v : null,
		group: 'color-controls'
	}
};

const UI_CONSTANTS = {
	SCALE: 40,
	GRID_SIZE: 20,
	SELECTION_COLOR: '#5e6ad2',
	HANDLE_COLOR: '#ff4757',
	HANDLE_SIZE: 10,
	HANDLE_HIT_RADIUS: 12,
	GRID_RENDER_COLOR: '#e1e4e8',
	AXES_RENDER_COLOR: '#000000',
	AXIS_HELPER_COLOR: 'rgba(94, 106, 210, 0.2)',
	CONTROL_LINE_COLOR: '#9496a1',
	HIT_TOLERANCE: 8
};

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

const getBoundingBoxFromCoords = (s) => ({
	minX: Math.min(s.x1, s.x2),
	minY: Math.min(s.y1, s.y2),
	maxX: Math.max(s.x1, s.x2),
	maxY: Math.max(s.y1, s.y2),
});

function distToSegment(x, y, x1, y1, x2, y2) {
	const A = x - x1;
	const B = y - y1;
	const C = x2 - x1;
	const D = y2 - y1;
	const dot = A * C + B * D;
	const lenSq = C * C + D * D;
	let param = -1;
	if (lenSq !== 0) param = dot / lenSq;
	let xx, yy;
	if (param < 0) { xx = x1; yy = y1; }
	else if (param > 1) { xx = x2; yy = y2; }
	else { xx = x1 + param * C; yy = y1 + param * D; }
	const dx = x - xx;
	const dy = y - yy;
	return Math.sqrt(dx * dx + dy * dy);
}

const defaultHitTest = (s, x, y) => {
	const tolerance = UI_CONSTANTS.HIT_TOLERANCE + (s.style.width || 1);
	
	const box = getBoundingBoxFromCoords(s);
	if (x < box.minX - tolerance || x > box.maxX + tolerance || 
		y < box.minY - tolerance || y > box.maxY + tolerance) {
		return false;
	}

	if (s.type === 'line') {
		return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < tolerance;
	}

	if (s.type === 'rect') {
		if (s.style.fill) {
			return x >= Math.min(s.x1, s.x2) && x <= Math.max(s.x1, s.x2) &&
				   y >= Math.min(s.y1, s.y2) && y <= Math.max(s.y1, s.y2);
		} else {
			const xMin = Math.min(s.x1, s.x2), xMax = Math.max(s.x1, s.x2);
			const yMin = Math.min(s.y1, s.y2), yMax = Math.max(s.y1, s.y2);
			return (Math.abs(x - xMin) < tolerance && y >= yMin - tolerance && y <= yMax + tolerance) ||
				   (Math.abs(x - xMax) < tolerance && y >= yMin - tolerance && y <= yMax + tolerance) ||
				   (Math.abs(y - yMin) < tolerance && x >= xMin - tolerance && x <= xMax + tolerance) ||
				   (Math.abs(y - yMax) < tolerance && x >= xMin - tolerance && x <= xMax + tolerance);
		}
	}

	if (s.type === 'circle') {
		const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
		const d = Math.sqrt(Math.pow(x - s.x1, 2) + Math.pow(y - s.y1, 2));
		if (s.style.fill) return d <= r;
		return Math.abs(d - r) < tolerance || d < tolerance;
	}

	if (s.type === 'ellipse') {
		const cx = s.x1;
		const cy = s.y1;
		const rx = Math.abs(s.x2 - s.x1);
		const ry = Math.abs(s.y2 - s.y1);
		
		if (rx === 0 || ry === 0) return false;
		
		const normDist = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2);
		const distToCenter = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));

		if (s.style.fill) return normDist <= 1;
		return (Math.abs(Math.sqrt(normDist) - 1) * Math.min(rx, ry) < tolerance) || distToCenter < tolerance;
	}

	if (s.type === 'triangle') {
		const p1 = {x: s.x1, y: s.y1};
		const p2 = {x: s.x2, y: s.y2};
		const p3 = {x: s.x3, y: s.y3};

		if (s.style.fill) {
			const denominator = ((p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y));
			const a = ((p2.y - p3.y) * (x - p3.x) + (p3.x - p2.x) * (y - p3.y)) / denominator;
			const b = ((p3.y - p1.y) * (x - p3.x) + (p1.x - p3.x) * (y - p3.y)) / denominator;
			const c = 1 - a - b;
			return a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1;
		} else {
			return distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < tolerance ||
				   distToSegment(x, y, p2.x, p2.y, p3.x, p3.y) < tolerance ||
				   distToSegment(x, y, p3.x, p3.y, p1.x, p1.y) < tolerance;
		}
	}
	
	return true;
};

const defaultMove = (s, dx, dy) => {
	s.x1 += dx; s.y1 += dy;
	s.x2 += dx; s.y2 += dy;
};

const defaultResize = (s, mx, my, handle) => {
	if (handle.includes('l')) s.x1 = mx;
	if (handle.includes('r')) s.x2 = mx;
	if (handle.includes('t')) s.y1 = my;
	if (handle.includes('b')) s.y2 = my;
};

const defaultGetHandles = (s) => {
	const box = getBoundingBoxFromCoords(s);
	const cx = (box.minX + box.maxX) / 2;
	const cy = (box.minY + box.maxY) / 2;
	return [
		{ x: box.minX, y: box.minY, pos: 'tl', cursor: 'nwse-resize' },
		{ x: cx,   y: box.minY, pos: 'tm', cursor: 'ns-resize' },
		{ x: box.maxX, y: box.minY, pos: 'tr', cursor: 'nesw-resize' },
		{ x: box.maxX, y: cy,   pos: 'mr', cursor: 'ew-resize' },
		{ x: box.maxX, y: box.maxY, pos: 'br', cursor: 'nwse-resize' },
		{ x: cx,   y: box.maxY, pos: 'bm', cursor: 'ns-resize' },
		{ x: box.minX, y: box.maxY, pos: 'bl', cursor: 'nesw-resize' },
		{ x: box.minX, y: cy,   pos: 'ml', cursor: 'ew-resize' },
	];
};

const ShapeDefaults = {
	getBoundingBox: getBoundingBoxFromCoords,
	hitTest: defaultHitTest,
	move: defaultMove,
	resize: defaultResize,
	getHandles: defaultGetHandles,
	onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; }
};

const createShapeDef = (type, overrides) => {
	return {
		type,
		...ShapeDefaults,
		...overrides,
		onDown: (x, y, style) => ({ type, x1: x, y1: y, x2: x, y2: y, style: { ...style }, ...overrides.extraProps }),
	};
};

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

const ShapeManager = {
	text: createShapeDef('text', {
		render: (s, ctx) => {
			ctx.font = '16px sans-serif';
			if (s.style.textSize === 'tiny') ctx.font = '10px sans-serif';
			if (s.style.textSize === 'scriptsize') ctx.font = '12px sans-serif';
			if (s.style.textSize === 'large') ctx.font = '20px sans-serif';
			if (s.style.textSize === 'Huge') ctx.font = '28px sans-serif';
			ctx.fillStyle = s.style.stroke;
			ctx.fillText(s.style.text || 'Texte', s.x1, s.y1);
		},
		toTikZ: (s) => {
			const text = s.style.text || 'Texte';
			return `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) node {${text}};`;
		},
		getBoundingBox: (s) => {
			const w = (s.style.text || 'Texte').length * 8; 
			return { minX: s.x1, minY: s.y1 - 15, maxX: s.x1 + w, maxY: s.y1 + 5 };
		},
		resize: (s, mx, my) => { s.x1 = mx; s.y1 = my; },
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'tl', cursor: 'move' }],
		onDown: (x, y, style) => ({ type: 'text', x1: x, y1: y, x2: x, y2: y, style: { ...style, text: style.text || 'Texte' } }),
		onDrag: (s, x, y) => { s.x1 = x; s.y1 = y; s.x2 = x; s.y2 = y; }
	}),
	line: createShapeDef('line', {
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x2, s.y2);
			ctx.stroke();
		},
		toTikZ: (s) => `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) -- (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		onDown: (x, y, style) => ({ type: 'line', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }
		],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const t = UI_CONSTANTS.HIT_TOLERANCE + (s.style.width || 1);
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < t;
		}
	}),
	rect: createShapeDef('rect', {
		render: (s, ctx) => {
			if (s.style.fill) ctx.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
			ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
		},
		toTikZ: (s) => `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) rectangle (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`
	}),
	circle: createShapeDef('circle', {
		render: (s, ctx) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const r = toTikZ(Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2)));
			return `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) circle (${r});`;
		},
		getBoundingBox: (s) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			return { minX: s.x1 - r, minY: s.y1 - r, maxX: s.x1 + r, maxY: s.y1 + r };
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'center') {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				s.x1 += dx;
				s.y1 += dy;
				s.x2 += dx;
				s.y2 += dy;
			} else {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				const r = Math.sqrt(dx*dx + dy*dy);
				s.x2 = s.x1 + r;
				s.y2 = s.y1;
			}
		},
		getHandles: (s) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			return [
				{ x: s.x1, y: s.y1, pos: 'center', cursor: 'move' },
				{ x: s.x1 + r, y: s.y1, pos: 'e', cursor: 'ew-resize' },
				{ x: s.x1 - r, y: s.y1, pos: 'w', cursor: 'ew-resize' },
				{ x: s.x1, y: s.y1 - r, pos: 'n', cursor: 'ns-resize' },
				{ x: s.x1, y: s.y1 + r, pos: 's', cursor: 'ns-resize' }
			];
		},
		onDown: (x, y, style) => ({ type: 'circle', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; }
	}),
	ellipse: createShapeDef('ellipse', {
		render: (s, ctx) => {
			const rx = Math.abs(s.x2 - s.x1);
			const ry = Math.abs(s.y2 - s.y1);
			ctx.ellipse(s.x1, s.y1, rx, ry, 0, 0, Math.PI * 2);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const rx = toTikZ(Math.abs(s.x2 - s.x1));
			const ry = toTikZ(Math.abs(s.y2 - s.y1));
			return `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) ellipse (${rx} and ${ry});`;
		},
		getBoundingBox: (s) => {
			const rx = Math.abs(s.x2 - s.x1);
			const ry = Math.abs(s.y2 - s.y1);
			return { minX: s.x1 - rx, minY: s.y1 - ry, maxX: s.x1 + rx, maxY: s.y1 + ry };
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'center') {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				const rx = s.x2 - s.x1;
				const ry = s.y2 - s.y1;
				s.x1 = mx;
				s.y1 = my;
				s.x2 = s.x1 + rx;
				s.y2 = s.y1 + ry;
			} else if (handle === 'n' || handle === 's') {
				const ry = Math.abs(my - s.y1);
				s.y2 = s.y1 + ry;
			} else if (handle === 'w' || handle === 'e') {
				const rx = Math.abs(mx - s.x1);
				s.x2 = s.x1 + rx;
			}
		},
		getHandles: (s) => {
			const rx = Math.abs(s.x2 - s.x1);
			const ry = Math.abs(s.y2 - s.y1);
			return [
				{ x: s.x1, y: s.y1, pos: 'center', cursor: 'move' },
				{ x: s.x1, y: s.y1 - ry, pos: 'n', cursor: 'ns-resize' },
				{ x: s.x1, y: s.y1 + ry, pos: 's', cursor: 'ns-resize' },
				{ x: s.x1 - rx, y: s.y1, pos: 'w', cursor: 'ew-resize' },
				{ x: s.x1 + rx, y: s.y1, pos: 'e', cursor: 'ew-resize' }
			];
		},
		onDown: (x, y, style) => ({ type: 'ellipse', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; }
	}),
	triangle: createShapeDef('triangle', {
		extraProps: { x3: 0, y3: 0 },
		onDown: (x, y, style) => ({ 
			type: 'triangle', 
			x1: x, y1: y, 
			x2: x, y2: y, 
			x3: x, y3: y, 
			style: { ...style } 
		}),
		onDrag: (s, x, y, step) => {
			if (step === 0) {
				s.x2 = x; s.y2 = y;
				s.x3 = x; s.y3 = y;
			} else {
				s.x3 = x; s.y3 = y;
			}
		},
		onNextStep: (s, step) => step >= 1,
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x2, s.y2);
			ctx.lineTo(s.x3, s.y3);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const p1 = `(${toTikZ(s.x1)},${toTikZ(s.y1, true)})`;
			const p2 = `(${toTikZ(s.x2)},${toTikZ(s.y2, true)})`;
			const p3 = `(${toTikZ(s.x3)},${toTikZ(s.y3, true)})`;
			return `${p1} -- ${p2} -- ${p3} -- cycle;`;
		},
		move: (s, dx, dy) => {
			s.x1 += dx; s.y1 += dy;
			s.x2 += dx; s.y2 += dy;
			s.x3 += dx; s.y3 += dy;
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'p1') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'p2') { s.x2 = mx; s.y2 = my; }
			else if (handle === 'p3') { s.x3 = mx; s.y3 = my; }
		},
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'p1', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'p2', cursor: 'move' },
			{ x: s.x3, y: s.y3, pos: 'p3', cursor: 'move' }
		],
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2, s.x3),
			minY: Math.min(s.y1, s.y2, s.y3),
			maxX: Math.max(s.x1, s.x2, s.x3),
			maxY: Math.max(s.y1, s.y2, s.y3)
		})
	}),
	grid: createShapeDef('grid', {
		onDown: (x, y, style) => {
			const stepPx = (style.gridStep || 0.5) * UI_CONSTANTS.SCALE;
			const snapX = Math.round(x / stepPx) * stepPx;
			const snapY = Math.round(y / stepPx) * stepPx;
			return { type: 'grid', x1: snapX, y1: snapY, x2: snapX + stepPx, y2: snapY + stepPx, style: { ...style } };
		},
		onDrag: (s, x, y) => {
			const stepPx = (s.style.gridStep || 0.5) * UI_CONSTANTS.SCALE;
			s.x2 = Math.round(x / stepPx) * stepPx;
			s.y2 = Math.round(y / stepPx) * stepPx;
		},
		resize: (s, mx, my, handle) => {
			const stepPx = (s.style.gridStep || 0.5) * UI_CONSTANTS.SCALE;
			const snapX = Math.round(mx / stepPx) * stepPx;
			const snapY = Math.round(my / stepPx) * stepPx;
			if (handle.includes('l')) s.x1 = snapX;
			if (handle.includes('r')) s.x2 = snapX;
			if (handle.includes('t')) s.y1 = snapY;
			if (handle.includes('b')) s.y2 = snapY;
		},
		render: (s, ctx) => {
			const box = getBoundingBoxFromCoords(s);
			const step = (s.style.gridStep || 0.5) * UI_CONSTANTS.SCALE; 
			
			const startX = Math.min(s.x1, s.x2);
			const startY = Math.min(s.y1, s.y2);
			const endX = Math.max(s.x1, s.x2);
			const endY = Math.max(s.y1, s.y2);

			ctx.beginPath();
			for (let x = startX; x <= endX + 0.1; x += step) { 
				ctx.moveTo(x, startY); ctx.lineTo(x, endY); 
			}
			for (let y = startY; y <= endY + 0.1; y += step) { 
				ctx.moveTo(startX, y); ctx.lineTo(endX, y); 
			}
			ctx.stroke();
		},
		toTikZ: (s) => {
			const opts = buildTikzOptions(s);
			const step = s.style.gridStep || 0.5;
			const x1 = Math.min(s.x1, s.x2);
			const y1 = Math.min(s.y1, s.y2);
			const x2 = Math.max(s.x1, s.x2);
			const y2 = Math.max(s.y1, s.y2);
			return `\\draw${opts} (${toTikZ(x1)},${toTikZ(y1, true)}) grid[step=${step}] (${toTikZ(x2)},${toTikZ(y2, true)});`;
		},
		isStandaloneCommand: true
	}),
	axes: createShapeDef('axes', {
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y2); ctx.lineTo(s.x2, s.y2);
			ctx.moveTo(s.x1, s.y2); ctx.lineTo(s.x1, s.y1);
			ctx.stroke();
			
			const arrowStyle = s.style.arrow || '->';
			if (arrowStyle !== 'none') {
				drawArrow(ctx, s.x2, s.y2, 0, arrowStyle, s.style.width);
				drawArrow(ctx, s.x1, s.y1, -Math.PI / 2, arrowStyle, s.style.width);
			}
		},
		toTikZ: (s) => {
			const opts = buildTikzOptions(s) || '[]';
			const arrowOpt = s.style.arrow !== 'none' ? s.style.arrow : '';
			const finalOpts = opts.replace(']', (arrowOpt ? ',' + arrowOpt : '') + ']');
			return `  \\draw${finalOpts} (${toTikZ(s.x1)},${toTikZ(s.y2, true)}) -- (${toTikZ(s.x2)},${toTikZ(s.y2, true)}) node[right] {$x$};\n  \\draw${finalOpts} (${toTikZ(s.x1)},${toTikZ(s.y2, true)}) -- (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) node[above] {$y$};`;
		},
		isStandaloneCommand: true,
		hitTest: (s, x, y) => {
			const t = UI_CONSTANTS.HIT_TOLERANCE + s.style.width;
			return distToSegment(x, y, s.x1, s.y2, s.x2, s.y2) < t ||
				   distToSegment(x, y, s.x1, s.y2, s.x1, s.y1) < t;
		}
	}),
	arc: createShapeDef('arc', {
		extraProps: { radius: 0, startAngle: 0, endAngle: 0 },
		onDown: (x, y, style) => ({ 
			type: 'arc', 
			x1: x, y1: y, 
			x2: x, y2: y,
			radius: 0, 
			startAngle: 0, 
			endAngle: 0, 
			style: { ...style } 
		}),
		onDrag: (s, x, y) => {
			s.x2 = x; s.y2 = y;
			const dx = x - s.x1;
			const dy = y - s.y1;
			s.radius = Math.sqrt(dx*dx + dy*dy);
			s.endAngle = Math.atan2(dy, dx);
		},
		render: (s, ctx) => {
			ctx.arc(s.x1, s.y1, s.radius, s.startAngle, s.endAngle, false);
			ctx.stroke();
		},
		toTikZ: (s) => {
			const startDeg = Math.round(s.startAngle * 180 / Math.PI);
			const endDeg = Math.round(s.endAngle * 180 / Math.PI);
			const r = toTikZ(s.radius);
			return `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) arc (${startDeg}:${endDeg}:${r});`;
		},
		move: (s, dx, dy) => {
			s.x1 += dx; s.y1 += dy;
			s.x2 += dx; s.y2 += dy;
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'center') {
				s.x1 = mx; s.y1 = my;
			} else {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				const newAngle = Math.atan2(dy, dx);
				const newRadius = Math.sqrt(dx*dx + dy*dy);
				
				s.radius = newRadius;
				if (handle === 'start') s.startAngle = newAngle;
				else if (handle === 'end') s.endAngle = newAngle;
			}
		},
		getHandles: (s) => {
			const sx = s.x1 + s.radius * Math.cos(s.startAngle);
			const sy = s.y1 + s.radius * Math.sin(s.startAngle);
			const ex = s.x1 + s.radius * Math.cos(s.endAngle);
			const ey = s.y1 + s.radius * Math.sin(s.endAngle);
			return [
				{ x: s.x1, y: s.y1, pos: 'center', cursor: 'move' },
				{ x: sx, y: sy, pos: 'start', cursor: 'crosshair' },
				{ x: ex, y: ey, pos: 'end', cursor: 'crosshair' }
			];
		},
		drawHandles: (s, ctx) => {
			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x1 + s.radius * Math.cos(s.startAngle), s.y1 + s.radius * Math.sin(s.startAngle));
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x1 + s.radius * Math.cos(s.endAngle), s.y1 + s.radius * Math.sin(s.endAngle));
			ctx.strokeStyle = UI_CONSTANTS.CONTROL_LINE_COLOR;
			ctx.setLineDash([2, 2]);
			ctx.stroke();
			ctx.setLineDash([]);
		},
		hitTest: (s, x, y) => {
			const dx = x - s.x1;
			const dy = y - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const t = UI_CONSTANTS.HIT_TOLERANCE + (s.style.width || 1);
			
			if (Math.abs(dist - s.radius) > t) return false;
			
			let angle = Math.atan2(dy, dx);
			let start = s.startAngle;
			let end = s.endAngle;
			
			const normalize = (a) => (a % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
			angle = normalize(angle);
			start = normalize(start);
			end = normalize(end);
			
			if (start < end) return angle >= start - 0.1 && angle <= end + 0.1;
			return angle >= start - 0.1 || angle <= end + 0.1;
		}
	}),
	curve: createShapeDef('curve', {
		extraProps: { cp1x: 0, cp1y: 0, cp2x: 0, cp2y: 0 },
		onDown: (x, y, style) => ({ 
			type: 'curve', 
			x1: x, y1: y, 
			x2: x, y2: y, 
			cp1x: x, cp1y: y, 
			cp2x: x, cp2y: y, 
			style: { ...style } 
		}),
		onDrag: (s, x, y, step) => {
			if (step === 0) {
				s.x2 = x; s.y2 = y;
				s.cp1x = s.x1 + (s.x2 - s.x1) * 0.33; 
				s.cp1y = s.y1 + (s.y2 - s.y1) * 0.33;
				s.cp2x = s.x1 + (s.x2 - s.x1) * 0.66; 
				s.cp2y = s.y1 + (s.y2 - s.y1) * 0.66;
			} else if (step === 1) {
				s.cp1x = x; s.cp1y = y;
			} else if (step === 2) {
				s.cp2x = x; s.cp2y = y;
			}
		},
		onNextStep: (s, step) => step >= 2,
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y1);
			ctx.bezierCurveTo(s.cp1x, s.cp1y, s.cp2x, s.cp2y, s.x2, s.y2);
			ctx.stroke();
		},
		toTikZ: (s) => `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) .. controls (${toTikZ(s.cp1x)},${toTikZ(s.cp1y, true)}) and (${toTikZ(s.cp2x)},${toTikZ(s.cp2y, true)}) .. (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getBoundingBox: (s) => {
			const minX = Math.min(s.x1, s.x2, s.cp1x, s.cp2x);
			const minY = Math.min(s.y1, s.y2, s.cp1y, s.cp2y);
			const maxX = Math.max(s.x1, s.x2, s.cp1x, s.cp2x);
			const maxY = Math.max(s.y1, s.y2, s.cp1y, s.cp2y);
			return { minX, minY, maxX, maxY };
		},
		move: (s, dx, dy) => {
			s.x1 += dx; s.y1 += dy;
			s.x2 += dx; s.y2 += dy;
			s.cp1x += dx; s.cp1y += dy;
			s.cp2x += dx; s.cp2y += dy;
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'p1') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'p2') { s.x2 = mx; s.y2 = my; }
			else if (handle === 'cp1') { s.cp1x = mx; s.cp1y = my; }
			else if (handle === 'cp2') { s.cp2x = mx; s.cp2y = my; }
		},
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'p1', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'p2', cursor: 'move' },
			{ x: s.cp1x, y: s.cp1y, pos: 'cp1', cursor: 'pointer' },
			{ x: s.cp2x, y: s.cp2y, pos: 'cp2', cursor: 'pointer' }
		],
		drawHandles: (s, ctx) => {
			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.cp1x, s.cp1y);
			ctx.moveTo(s.x2, s.y2); ctx.lineTo(s.cp2x, s.cp2y);
			ctx.strokeStyle = UI_CONSTANTS.CONTROL_LINE_COLOR; 
			ctx.lineWidth = 1;
			ctx.stroke();
			
			[
				{x: s.x1, y: s.y1, color: UI_CONSTANTS.SELECTION_COLOR}, 
				{x: s.x2, y: s.y2, color: UI_CONSTANTS.SELECTION_COLOR}, 
				{x: s.cp1x, y: s.cp1y, color: UI_CONSTANTS.HANDLE_COLOR}, 
				{x: s.cp2x, y: s.cp2y, color: UI_CONSTANTS.HANDLE_COLOR}
			].forEach((p, i) => {
				ctx.fillStyle = p.color; 
				ctx.strokeStyle = 'white';
				ctx.lineWidth = 2;
				ctx.beginPath(); 
				ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
				ctx.fill(); 
				ctx.stroke();
			});
		},
		hitTest: (s, x, y) => {
			const t = UI_CONSTANTS.HIT_TOLERANCE + s.style.width;
			for(let i=0; i<=40; i++) {
				const t_val = i / 40;
				const invT = 1 - t_val;
				const px = invT*invT*invT*s.x1 + 3*invT*invT*t_val*s.cp1x + 3*invT*t_val*t_val*s.cp2x + t_val*t_val*t_val*s.x2;
				const py = invT*invT*invT*s.y1 + 3*invT*invT*t_val*s.cp1y + 3*invT*t_val*t_val*s.cp2y + t_val*t_val*t_val*s.y2;
				if(Math.abs(x - px) < t && Math.abs(y - py) < t) return true;
			}
			return false;
		}
	})
};

let currentState = { ...initialState };

function createToolsUI() {
	const containers = {
		general: document.getElementById('tools-general'),
		drawing: document.getElementById('tools-drawing')
	};

	Object.values(containers).forEach(c => c.innerHTML = '');

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
}

function resizeCanvas() {
	canvas.width = canvas.parentElement.clientWidth;
	canvas.height = canvas.parentElement.clientHeight;
	if (app.history.length === 0) {
		pushState();
	}
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
}

function updateSetting(element) {
	const key = element.dataset.setting;

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
		return;
	}

	const config = SETTINGS_CONFIG[key];
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
	const target = app.selectedShape ? app.selectedShape.style : app.drawingStyle;
	target[propName] = value;

	if (config.type === 'range') {
		 const valueSpan = document.getElementById(`${key}Value`);
		 if (valueSpan) {
			 const isPercent = config.unit === '%';
			 valueSpan.textContent = isPercent ? `${Math.round(value * 100)}%` : `${value}${config.unit}`;
		 }
	}

	if (key === 'arrowStyle') {
		const toolName = app.activeTool === app.toolManager.select ? 'select' : app.activeTool.shapeType;
		const shapeType = app.selectedShape ? app.selectedShape.type : null;
		updateSettingsVisibility(toolName, shapeType);
	}

	if (app.selectedShape) {
		render();
		generateCode();
		pushState();
	}
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

function toTikZ(val, isY = false) {
	let res = val / UI_CONSTANTS.SCALE;
	if (isY) res = (canvas.height - val) / UI_CONSTANTS.SCALE;
	return parseFloat(res.toFixed(2));
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
	
	if (s.style.arrow && s.style.arrow !== 'none' && (s.type === 'line' || s.type === 'curve' || s.type === 'arc' || s.type === 'axes')) {
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
		let headStr = head;
		if (head === 'Triangle 45') headStr = 'Triangle[angle=45:1pt]'; 
		else if (head === 'To') headStr = 'To';
		
		if (scale !== 1) {
			opts.push(`>=${headStr}[scale=${scale}]`);
		} else {
			opts.push(`>=${headStr}`);
		}
	}

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		
		if (config.excludeFrom && config.excludeFrom.includes(s.type)) continue;

		if (key === 'arrowHead' || key === 'arrowScale') continue;

		const prop = config.propName || key;
		const val = style[prop];
		
		if (config.tikzValue) {
			const processedVal = config.tikzValue(val);
			if (processedVal !== null) {
				if (config.isColor) {
					opts.push(`${config.tikzKey}=${app.colors.get(processedVal) || processedVal}`);
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
	let out = "\\begin{tikzpicture}\n";
	app.colors.clear();
	let cIdx = 1;

	const usedColors = new Set();
	app.shapes.forEach(s => {
		for(const key in SETTINGS_CONFIG) {
			const conf = SETTINGS_CONFIG[key];
			if(conf.isColor) {
				const prop = conf.propName || key;
				const val = s.style[prop];
				if(val && conf.tikzValue(val) !== null) usedColors.add(val);
			}
		}
	});

	usedColors.forEach(hex => {
		const name = 'c' + cIdx++;
		app.colors.set(hex, name);
		out += `  \\definecolor{${name}}{HTML}{${hex.substring(1).toUpperCase()}}\n`;
	});
	
	if (app.colors.size) out += "\n";

	app.shapes.forEach(s => {
		const shapeDef = ShapeManager[s.type];
		if (!shapeDef || !shapeDef.toTikZ) return;

		let tikzString = shapeDef.toTikZ(s);
		
		if (shapeDef.isStandaloneCommand) {
			 out += `  ${tikzString}\n`;
		} else {
			 const optStr = buildTikzOptions(s);
			 out += `  \\draw${optStr} ${tikzString}\n`;
		}
	});

	out += "\\end{tikzpicture}";
	output.value = out;
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
	pushState();
	render();
	generateCode();
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
}

function undo() {
	if (app.historyIndex > 0) {
		app.historyIndex--;
		app.shapes = JSON.parse(app.history[app.historyIndex]);
		app.selectedShape = null;
		render();
		generateCode();
		updateUndoRedoUI();
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
		'opacity', 'textString', 'textSize', 'gridStep'
	];
	
	fields.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			const config = SETTINGS_CONFIG[id];
			const prop = config ? (config.propName || id) : id;
			if (style[prop] !== undefined) {
				el.value = style[prop];
			} else if (config) {
				el.value = config.defaultValue;
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
	
	document.getElementById('fillColor').value = style.fill || SETTINGS_CONFIG.fillColor.defaultValue;

	const lwVal = document.getElementById('lineWidthValue');
	if (lwVal) lwVal.textContent = style.width + 'pt';

	const asVal = document.getElementById('arrowScaleValue');
	if (asVal) asVal.textContent = (style.arrowScale || 1) + 'x';
	
	const opVal = document.getElementById('opacityValue');
	if (opVal) opVal.textContent = Math.round(style.opacity * 100) + '%';
	
	const fillColorInput = document.getElementById('fillColor');
	fillColorInput.style.opacity = style.fill ? '1' : '0.2';
	fillColorInput.style.pointerEvents = style.fill ? 'auto' : 'none';
	fillColorInput.disabled = !style.fill;

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
		{ x: cx,   y: minY, pos: 'tm', cursor: 'ns-resize' },
		{ x: maxX, y: minY, pos: 'tr', cursor: 'nesw-resize' },
		{ x: maxX, y: cy,   pos: 'mr', cursor: 'ew-resize' },
		{ x: maxX, y: maxY, pos: 'br', cursor: 'nwse-resize' },
		{ x: cx,   y: maxY, pos: 'bm', cursor: 'ns-resize' },
		{ x: minX, y: maxY, pos: 'bl', cursor: 'nesw-resize' },
		{ x: minX, y: cy,   pos: 'ml', cursor: 'ew-resize' },
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
	if (navigator.clipboard) {
		navigator.clipboard.writeText(output.value).catch(err => {
			console.error('Could not copy text: ', err);
		});
	} else {
		output.select();
		document.execCommand('copy');
	}
}

function init() {
	createToolsUI();
	createSettingsUI();

	document.getElementById('settings-container').addEventListener('input', (e) => {
		if (e.target.dataset.setting) {
			updateSetting(e.target);
		}
	});

	app.drawingStyle = generateInitialState();
	
	Object.entries(SETTINGS_CONFIG).forEach(([key, config]) => {
		const el = document.getElementById(key);
		if (!el) return;
		
		if(config.type === 'color-checkbox') {
			document.getElementById('hasFill').checked = config.enabledByDefault;
			el.style.opacity = config.enabledByDefault ? '1' : '0.2';
			el.style.pointerEvents = config.enabledByDefault ? 'auto' : 'none';
			el.disabled = !config.enabledByDefault;
		}
		el.value = config.defaultValue;
	});

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

	setTool('select');
	resizeCanvas();
	updateUndoRedoUI();
}

document.addEventListener('DOMContentLoaded', init);