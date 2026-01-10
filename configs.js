function toTikZ(val, isY = false) {
	let res = val / UI_CONSTANTS.SCALE;
	if (isY) res = (canvas.height - val) / UI_CONSTANTS.SCALE;
	return parseFloat(res.toFixed(2));
}

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

const getBoundingBoxFromCoords = (s) => ({
	minX: Math.min(s.x1, s.x2),
	minY: Math.min(s.y1, s.y2),
	maxX: Math.max(s.x1, s.x2),
	maxY: Math.max(s.y1, s.y2),
});

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
		{ x: cx,	 y: box.minY, pos: 'tm', cursor: 'ns-resize' },
		{ x: box.maxX, y: box.minY, pos: 'tr', cursor: 'nesw-resize' },
		{ x: box.maxX, y: cy,	 pos: 'mr', cursor: 'ew-resize' },
		{ x: box.maxX, y: box.maxY, pos: 'br', cursor: 'nwse-resize' },
		{ x: cx,	 y: box.maxY, pos: 'bm', cursor: 'ns-resize' },
		{ x: box.minX, y: box.maxY, pos: 'bl', cursor: 'nesw-resize' },
		{ x: box.minX, y: cy,	 pos: 'ml', cursor: 'ew-resize' },
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

/* --- */

const GLOBAL_SETTINGS_CONFIG = {
	figLabel: {
		label: 'Label (ex: fig:mon_schema)',
		type: 'text',
		defaultValue: ''
	},
	figCaption: {
		label: 'Légende (Caption)',
		type: 'text',
		defaultValue: ''
	},
	figScale: {
		label: 'Échelle TikZ',
		type: 'range',
		defaultValue: 1,
		min: 0.1, max: 3, step: 0.1,
		unit: 'x'
	},
	canvasZoom: {
		label: 'Zoom Grille (Visualisation)',
		type: 'range',
		defaultValue: 40,
		min: 10, max: 100, step: 5,
		unit: 'px'
	},
	stageColor: {
		label: 'Couleur de fond',
		type: 'color',
		defaultValue: '#eef1f5'
	}
};

const TOOL_CONFIG = {
	select: {
		displayName: 'Sélection',
		handler: 'SelectTool',
		icon: '<i class="ti ti-pointer"></i>',
		cursor: 'default',
		group: 'general',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'textRotate', 'textAnchor', 'textAlign', 'textWidth', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'gridStep', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
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
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'textRotate', 'textAnchor', 'textAlign', 'textWidth', 'strokeColor', 'opacity']
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
	diamond: {
		displayName: 'Losange',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
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
	wave: {
		displayName: 'Onde',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-wave-sine"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['waveType', 'waveAmplitude', 'waveLength', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'lineWidth', 'opacity', 'strokeColor']
	},
	polygon: {
		displayName: 'Polygone',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-polygon"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['polySides', 'lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	star: {
		displayName: 'Étoile',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-star"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['starPoints', 'starRatio', 'lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	resistor: {
		displayName: 'Résistance',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-wave-square"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	capacitor: {
		displayName: 'Condensateur',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-pause"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	inductor: {
		displayName: 'Bobine',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-infinity"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	diode: {
		displayName: 'Diode',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-play" style="font-size: 0.7em;"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	source_dc: {
		displayName: 'Source DC',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-car-battery"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	source_ac: {
		displayName: 'Source AC',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-water"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	lamp: {
		displayName: 'Lampe',
		handler: 'DrawingTool',
		icon: '<i class="fa-regular fa-lightbulb"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	switch: {
		displayName: 'Interrupteur',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-toggle-off"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	ground: {
		displayName: 'Masse',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-arrow-down"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	lens_convex: {
		displayName: 'Lentille Convergente',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-magnify"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	lens_concave: {
		displayName: 'Lentille Divergente',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-magnify-minus"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	mirror: {
		displayName: 'Miroir',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-mirror"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor']
	},
	logic_and: {
		displayName: 'Porte ET',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-and"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	logic_or: {
		displayName: 'Porte OU',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-or"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	logic_not: {
		displayName: 'Porte NON',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-not"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	flow_start: {
		displayName: 'Début/Fin',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-player-record"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	flow_process: {
		displayName: 'Processus',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-settings"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	flow_decision: {
		displayName: 'Décision',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
};

const SETTINGS_CONFIG = {
	textString: {
		label: 'Contenu',
		type: 'textarea',
		propName: 'text',
		defaultValue: 'Nouveau Texte',
		tikzValue: (v) => null
	},
	textSize: {
		label: 'Taille TikZ',
		type: 'select',
		propName: 'textSize',
		defaultValue: 'normalsize',
		options: {
			'tiny': 'Tiny',
			'scriptsize': 'Scriptsize',
			'footnotesize': 'Footnotesize',
			'small': 'Small',
			'normalsize': 'Normal',
			'large': 'Large',
			'Large': 'Large +',
			'LARGE': 'LARGE',
			'huge': 'Huge',
			'Huge': 'Huge +'
		},
		tikzKey: 'font',
		tikzValue: (v) => v === 'normalsize' ? null : `\\${v}`
	},
	textFont: {
		label: 'Famille de police',
		type: 'select',
		propName: 'textFont',
		defaultValue: 'sans',
		options: {
			'serif': 'Serif (Roman)',
			'sans': 'Sans Serif',
			'mono': 'Monospace (Typewriter)'
		},
		tikzValue: (v) => null
	},
	textWeight: {
		label: 'Graisse',
		type: 'select',
		propName: 'textWeight',
		defaultValue: 'none',
		options: {
			'none': 'Normal',
			'bfseries': 'Gras'
		},
		tikzValue: (v) => null
	},
	textSlant: {
		label: 'Style',
		type: 'select',
		propName: 'textSlant',
		defaultValue: 'none',
		options: {
			'none': 'Normal',
			'itshape': 'Italique'
		},
		tikzValue: (v) => null
	},
	textRotate: {
		label: 'Rotation',
		type: 'range',
		propName: 'textRotate',
		defaultValue: 0,
		min: 0, max: 360, step: 5,
		unit: '°',
		tikzKey: 'rotate',
		tikzValue: (v) => v === 0 ? null : v
	},
	textAnchor: {
		label: 'Ancrage TikZ',
		type: 'select',
		propName: 'textAnchor',
		defaultValue: 'center',
		options: {
			'center': 'Centre',
			'north': 'Nord (Haut)',
			'south': 'Sud (Bas)',
			'east': 'Est (Droite)',
			'west': 'Ouest (Gauche)',
			'north east': 'Nord-Est',
			'north west': 'Nord-Ouest',
			'south east': 'Sud-Est',
			'south west': 'Sud-Ouest'
		},
		tikzKey: 'anchor',
		tikzValue: (v) => v === 'center' ? null : v
	},
	textAlign: {
		label: 'Alignement',
		type: 'select',
		propName: 'textAlign',
		defaultValue: 'center',
		options: {
			'left': 'Gauche',
			'center': 'Centre',
			'right': 'Droite',
			'justify': 'Justifié'
		},
		tikzKey: 'align',
		tikzValue: (v) => v === 'none' ? null : v
	},
	textWidth: {
		label: 'Largeur max (0=auto)',
		type: 'range',
		propName: 'textWidth',
		defaultValue: 0,
		min: 0, max: 10, step: 0.5,
		unit: 'cm',
		tikzKey: 'text width',
		tikzSuffix: 'cm',
		tikzValue: (v) => v === 0 ? null : v
	},
	polySides: {
		label: 'Côtés',
		type: 'range',
		propName: 'polySides',
		defaultValue: 5,
		min: 3, max: 12, step: 1,
		unit: '',
		tikzValue: (v) => null
	},
	starPoints: {
		label: 'Pointes',
		type: 'range',
		propName: 'starPoints',
		defaultValue: 5,
		min: 3, max: 12, step: 1,
		unit: '',
		tikzValue: (v) => null
	},
	starRatio: {
		label: 'Ratio interne',
		type: 'range',
		propName: 'starRatio',
		defaultValue: 0.5,
		min: 0.1, max: 0.9, step: 0.1,
		unit: '',
		tikzValue: (v) => null
	},
	waveType: {
		label: 'Type d\'onde',
		type: 'select',
		propName: 'waveType',
		defaultValue: 'sine',
		options: {
			'sine': 'Sinus',
			'triangle': 'Triangle',
			'square': 'Carré',
			'sawtooth': 'Dents de scie'
		},
		tikzValue: (v) => null
	},
	waveAmplitude: {
		label: 'Amplitude',
		type: 'range',
		propName: 'waveAmplitude',
		defaultValue: 0.5,
		min: 0.1, max: 5, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null
	},
	waveLength: {
		label: 'Longueur d\'onde',
		type: 'range',
		propName: 'waveLength',
		defaultValue: 1,
		min: 0.1, max: 5, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null
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

const ShapeManager = {
	text: createShapeDef('text', {
		render: (s, ctx) => {
			const sizeMap = {
				'tiny': 8, 'scriptsize': 10, 'footnotesize': 12, 'small': 13,
				'normalsize': 16, 'large': 18, 'Large': 22, 'LARGE': 26, 'huge': 30, 'Huge': 36
			};
			const fontMap = {
				'serif': 'serif',
				'sans': 'sans-serif',
				'mono': 'monospace'
			};
			const fontSize = sizeMap[s.style.textSize] || 16;
			const fontFamily = fontMap[s.style.textFont] || 'sans-serif';
			const weight = s.style.textWeight === 'bfseries' ? 'bold ' : '';
			const slant = s.style.textSlant === 'itshape' ? 'italic ' : '';
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate((s.style.textRotate || 0) * Math.PI / 180);
			
			const anchors = {
				'center': { x: 'center', y: 'middle' },
				'north': { x: 'center', y: 'top' },
				'south': { x: 'center', y: 'bottom' },
				'east': { x: 'right', y: 'middle' },
				'west': { x: 'left', y: 'middle' },
				'north east': { x: 'right', y: 'top' },
				'north west': { x: 'left', y: 'top' },
				'south east': { x: 'right', y: 'bottom' },
				'south west': { x: 'left', y: 'bottom' }
			};
			const anchor = anchors[s.style.textAnchor] || anchors.center;
			
			ctx.textAlign = anchor.x;
			ctx.textBaseline = anchor.y;
			ctx.font = `${slant}${weight}${fontSize}px ${fontFamily}`;
			ctx.fillStyle = s.style.stroke;
			ctx.globalAlpha = s.style.opacity;

			const lines = (s.style.text || 'Texte').split('\\\\');
			const lineHeight = fontSize * 1.2;
			const totalHeight = lines.length * lineHeight;
			let currentY = 0;

			if (anchor.y === 'middle') currentY = -((lines.length - 1) * lineHeight) / 2;
			else if (anchor.y === 'bottom') currentY = -(lines.length - 1) * lineHeight;

			lines.forEach(line => {
				ctx.fillText(line.trim(), 0, currentY);
				currentY += lineHeight;
			});

			ctx.restore();
		},
		toTikZ: (s) => {
			const text = s.style.text || 'Texte';
			const fontFamilies = {
				'serif': '\\rmfamily',
				'sans': '\\sffamily',
				'mono': '\\ttfamily'
			};
			const fontCmd = fontFamilies[s.style.textFont] || '';
			const weightCmd = s.style.textWeight === 'bfseries' ? '\\bfseries ' : '';
			const slantCmd = s.style.textSlant === 'itshape' ? '\\itshape ' : '';
			const familyCmd = fontCmd ? `${fontCmd} ` : '';
			const innerContent = `${familyCmd}${weightCmd}${slantCmd}${text}`;
			return `(${toTikZ(s.x1)},${toTikZ(s.y1, true)}) node {${innerContent}};`;
		},
		getBoundingBox: (s) => {
			const sizeMap = {
				'tiny': 8, 'scriptsize': 10, 'footnotesize': 12, 'small': 13,
				'normalsize': 16, 'large': 18, 'Large': 22, 'LARGE': 26, 'huge': 30, 'Huge': 36
			};
			const fontSize = sizeMap[s.style.textSize] || 16;
			const fontMap = { 'serif': 'serif', 'sans': 'sans-serif', 'mono': 'monospace' };
			const fontFamily = fontMap[s.style.textFont] || 'sans-serif';
			const weight = s.style.textWeight === 'bfseries' ? 'bold ' : '';
			const slant = s.style.textSlant === 'itshape' ? 'italic ' : '';
			
			const tempCtx = canvas.getContext('2d');
			tempCtx.font = `${slant}${weight}${fontSize}px ${fontFamily}`;
			
			const lines = (s.style.text || 'Texte').split('\\\\');
			let maxWidth = 0;
			lines.forEach(line => {
				const metrics = tempCtx.measureText(line.trim());
				maxWidth = Math.max(maxWidth, metrics.width);
			});
			
			const lineHeight = fontSize * 1.2;
			const height = lines.length * lineHeight;
			const padding = 8;

			return { 
				minX: s.x1 - maxWidth / 2 - padding, 
				minY: s.y1 - height / 2 - padding, 
				maxX: s.x1 + maxWidth / 2 + padding, 
				maxY: s.y1 + height / 2 + padding 
			};
		},
		resize: (s, mx, my) => { s.x1 = mx; s.y1 = my; },
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'tl', cursor: 'move' }],
		onDown: (x, y, style) => ({ 
			type: 'text', 
			x1: x, y1: y, 
			x2: x, y2: y, 
			style: { 
				...style, 
				text: style.text || 'Nouveau Texte',
				textRotate: style.textRotate || 0,
				textAnchor: style.textAnchor || 'center',
				textAlign: style.textAlign || 'center',
				textFont: style.textFont || 'sans',
				textSize: style.textSize || 'normalsize',
				textWeight: style.textWeight || 'none',
				textSlant: style.textSlant || 'none'
			} 
		}),
		onDrag: (s, x, y) => { s.x1 = x; s.y1 = y; s.x2 = x; s.y2 = y; },
		hitTest: (s, x, y) => {
			const box = ShapeManager.text.getBoundingBox(s);
			const angle = (s.style.textRotate || 0) * Math.PI / 180;
			
			if (angle === 0) {
				return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
			}
			
			const dx = x - s.x1;
			const dy = y - s.y1;
			const rx = dx * Math.cos(-angle) - dy * Math.sin(-angle);
			const ry = dx * Math.sin(-angle) + dy * Math.cos(-angle);
			
			const halfW = (box.maxX - box.minX) / 2;
			const halfH = (box.maxY - box.minY) / 2;
			
			return Math.abs(rx) <= halfW && Math.abs(ry) <= halfH;
		}
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
	diamond: createShapeDef('diamond', {
		render: (s, ctx) => {
			const minX = Math.min(s.x1, s.x2);
			const minY = Math.min(s.y1, s.y2);
			const maxX = Math.max(s.x1, s.x2);
			const maxY = Math.max(s.y1, s.y2);
			const cx = (minX + maxX) / 2;
			const cy = (minY + maxY) / 2;

			ctx.beginPath();
			ctx.moveTo(cx, minY);
			ctx.lineTo(maxX, cy);
			ctx.lineTo(cx, maxY);
			ctx.lineTo(minX, cy);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const minX = Math.min(s.x1, s.x2);
			const minY = Math.min(s.y1, s.y2);
			const maxX = Math.max(s.x1, s.x2);
			const maxY = Math.max(s.y1, s.y2);
			const cx = (minX + maxX) / 2;
			const cy = (minY + maxY) / 2;
			
			const p1 = `(${toTikZ(cx)},${toTikZ(minY, true)})`;
			const p2 = `(${toTikZ(maxX)},${toTikZ(cy, true)})`;
			const p3 = `(${toTikZ(cx)},${toTikZ(maxY, true)})`;
			const p4 = `(${toTikZ(minX)},${toTikZ(cy, true)})`;

			return `${p1} -- ${p2} -- ${p3} -- ${p4} -- cycle;`;
		},
		hitTest: (s, x, y) => {
			const tolerance = UI_CONSTANTS.HIT_TOLERANCE + (s.style.width || 1);
			const minX = Math.min(s.x1, s.x2);
			const minY = Math.min(s.y1, s.y2);
			const maxX = Math.max(s.x1, s.x2);
			const maxY = Math.max(s.y1, s.y2);
			const cx = (minX + maxX) / 2;
			const cy = (minY + maxY) / 2;

			if (x < minX - tolerance || x > maxX + tolerance || y < minY - tolerance || y > maxY + tolerance) {
				return false;
			}

			if (s.style.fill) {
				const hx = (maxX - minX) / 2;
				const hy = (maxY - minY) / 2;
				if (hx === 0 || hy === 0) return false;
				return (Math.abs(x - cx) / hx + Math.abs(y - cy) / hy) <= 1;
			} else {
				const p1 = { x: cx, y: minY };
				const p2 = { x: maxX, y: cy };
				const p3 = { x: cx, y: maxY };
				const p4 = { x: minX, y: cy };
				return distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < tolerance ||
						 distToSegment(x, y, p2.x, p2.y, p3.x, p3.y) < tolerance ||
						 distToSegment(x, y, p3.x, p3.y, p4.x, p4.y) < tolerance ||
						 distToSegment(x, y, p4.x, p4.y, p1.x, p1.y) < tolerance;
			}
		}
	}),
	polygon: createShapeDef('polygon', {
		onDown: (x, y, style) => ({
			type: 'polygon',
			x1: x, y1: y,
			x2: x, y2: y,
			style: { 
				...style,
				polySides: style.polySides || 5
			}
		}),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const sides = s.style.polySides || 5;
			const radius = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			const startAngle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
			
			ctx.beginPath();
			for (let i = 0; i < sides; i++) {
				const angle = startAngle + (i * 2 * Math.PI / sides);
				const px = s.x1 + radius * Math.cos(angle);
				const py = s.y1 + radius * Math.sin(angle);
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const sides = s.style.polySides || 5;
			const radius = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			const startAngle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
			
			let coords = [];
			for (let i = 0; i < sides; i++) {
				const angle = startAngle + (i * 2 * Math.PI / sides);
				const px = s.x1 + radius * Math.cos(angle);
				const py = s.y1 + radius * Math.sin(angle);
				coords.push(`(${toTikZ(px)},${toTikZ(py, true)})`);
			}
			return `${coords.join(' -- ')} -- cycle;`;
		},
		getBoundingBox: (s) => {
			const radius = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			return { minX: s.x1 - radius, minY: s.y1 - radius, maxX: s.x1 + radius, maxY: s.y1 + radius };
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'center') {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				s.x1 += dx; s.y1 += dy;
				s.x2 += dx; s.y2 += dy;
			} else {
				s.x2 = mx; s.y2 = my;
			}
		},
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'center', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'radius', cursor: 'crosshair' }
		]
	}),
	star: createShapeDef('star', {
		onDown: (x, y, style) => ({
			type: 'star',
			x1: x, y1: y,
			x2: x, y2: y,
			style: { 
				...style,
				starPoints: style.starPoints || 5,
				starRatio: style.starRatio || 0.5
			}
		}),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const points = s.style.starPoints || 5;
			const ratio = s.style.starRatio || 0.5;
			const radiusOuter = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			const radiusInner = radiusOuter * ratio;
			const startAngle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
			const step = Math.PI / points;
			
			ctx.beginPath();
			for (let i = 0; i < 2 * points; i++) {
				const r = (i % 2 === 0) ? radiusOuter : radiusInner;
				const angle = startAngle + i * step;
				const px = s.x1 + r * Math.cos(angle);
				const py = s.y1 + r * Math.sin(angle);
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const points = s.style.starPoints || 5;
			const ratio = s.style.starRatio || 0.5;
			const radiusOuter = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			const radiusInner = radiusOuter * ratio;
			const startAngle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
			const step = Math.PI / points;
			
			let coords = [];
			for (let i = 0; i < 2 * points; i++) {
				const r = (i % 2 === 0) ? radiusOuter : radiusInner;
				const angle = startAngle + i * step;
				const px = s.x1 + r * Math.cos(angle);
				const py = s.y1 + r * Math.sin(angle);
				coords.push(`(${toTikZ(px)},${toTikZ(py, true)})`);
			}
			return `${coords.join(' -- ')} -- cycle;`;
		},
		getBoundingBox: (s) => {
			const radius = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			return { minX: s.x1 - radius, minY: s.y1 - radius, maxX: s.x1 + radius, maxY: s.y1 + radius };
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'center') {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				s.x1 += dx; s.y1 += dy;
				s.x2 += dx; s.y2 += dy;
			} else {
				s.x2 = mx; s.y2 = my;
			}
		},
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'center', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'radius', cursor: 'crosshair' }
		]
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
		toTikZ: (s, opts) => {
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
		toTikZ: (s, opts) => {
			const arrowOpt = s.style.arrow !== 'none' ? s.style.arrow : '';
			const baseOpts = opts || '[]';
			const finalOpts = baseOpts.replace(']', (arrowOpt ? ',' + arrowOpt : '') + ']');
			return `\\draw${finalOpts} (${toTikZ(s.x1)},${toTikZ(s.y2, true)}) -- (${toTikZ(s.x2)},${toTikZ(s.y2, true)}) node[right] {$x$};\n	\\draw${finalOpts} (${toTikZ(s.x1)},${toTikZ(s.y2, true)}) -- (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) node[above] {$y$};`;
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
	}),
	wave: createShapeDef('wave', {
		onDown: (x, y, style) => ({ 
			type: 'wave', 
			x1: x, y1: y, 
			x2: x, y2: y,
			style: { 
				...style,
				waveType: style.waveType || 'sine',
				waveAmplitude: style.waveAmplitude || 0.5,
				waveLength: style.waveLength || 1
			} 
		}),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			const amp = (s.style.waveAmplitude || 0.5) * UI_CONSTANTS.SCALE;
			const lambda = (s.style.waveLength || 1) * UI_CONSTANTS.SCALE;
			const k = 2 * Math.PI / lambda;
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			
			const steps = Math.ceil(dist);
			for (let x = 0; x <= steps; x++) {
				let y = 0;
				const t = k * x;
				
				switch (s.style.waveType) {
					case 'triangle':
						y = amp * (2 / Math.PI) * Math.asin(Math.sin(t));
						break;
					case 'square':
						y = amp * Math.sign(Math.sin(t));
						break;
					case 'sawtooth':
						y = -amp * (2 / Math.PI) * Math.atan(1 / Math.tan(t / 2));
						break;
					case 'sine':
					default:
						y = amp * Math.sin(t);
						break;
				}
				
				if (x === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx) * 180 / Math.PI;
			
			const len = toTikZ(dist);
			const amp = s.style.waveAmplitude || 0.5;
			const lambda = s.style.waveLength || 1;
			
			let plotFunc = '';
			const k = `\\x*360/${lambda}`;
			
			switch (s.style.waveType) {
				case 'triangle':
					plotFunc = `{${amp}*asin(sin(${k}))/90}`;
					break;
				case 'square':
					plotFunc = `{${amp}*sign(sin(${k}))}`;
					break;
				case 'sawtooth':
					plotFunc = `{-${amp}*2/180*atan(cot(${k}/2))}`;
					break;
				case 'sine':
				default:
					plotFunc = `{${amp}*sin(${k})}`;
					break;
			}
			
			const opts = buildTikzOptions(s);
			return `\\draw${opts} [shift={(${toTikZ(s.x1)},${toTikZ(s.y1, true)})}, rotate=${angle.toFixed(2)}] plot[domain=0:${len}, samples=${Math.ceil(len * 20)}, variable=\\x] (\\x, ${plotFunc});`;
		},
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }
		],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const t = UI_CONSTANTS.HIT_TOLERANCE + (s.style.width || 1) + (s.style.waveAmplitude || 0.5) * UI_CONSTANTS.SCALE;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < t;
		},
		isStandaloneCommand: true
	}),
	resistor: createShapeDef('resistor', {
		onDown: (x, y, style) => ({ type: 'resistor', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			const l = dist;
			const w = 10;
			ctx.lineTo(l * 0.25, 0);
			ctx.lineTo(l * 0.3, -w);
			ctx.lineTo(l * 0.35, w);
			ctx.lineTo(l * 0.4, -w);
			ctx.lineTo(l * 0.45, w);
			ctx.lineTo(l * 0.5, -w);
			ctx.lineTo(l * 0.55, w);
			ctx.lineTo(l * 0.6, -w);
			ctx.lineTo(l * 0.65, w);
			ctx.lineTo(l * 0.7, -w);
			ctx.lineTo(l * 0.75, 0);
			ctx.lineTo(l, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[R] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	capacitor: createShapeDef('capacitor', {
		onDown: (x, y, style) => ({ type: 'capacitor', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			const w = 12;
			const gap = 4;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - gap, 0);
			ctx.moveTo(dist/2 - gap, -w);
			ctx.lineTo(dist/2 - gap, w);
			ctx.moveTo(dist/2 + gap, -w);
			ctx.lineTo(dist/2 + gap, w);
			ctx.moveTo(dist/2 + gap, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[C] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	inductor: createShapeDef('inductor', {
		onDown: (x, y, style) => ({ type: 'inductor', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			const loops = 4;
			const loopW = (dist * 0.4) / loops;
			ctx.lineTo(dist * 0.3, 0);
			for(let i=0; i<loops; i++) {
				const lx = dist * 0.3 + i*loopW;
				ctx.arc(lx + loopW/2, 0, loopW/2, Math.PI, 0);
			}
			ctx.moveTo(dist * 0.7, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[L] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	diode: createShapeDef('diode', {
		onDown: (x, y, style) => ({ type: 'diode', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			const w = 10;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - w, 0);
			
			ctx.moveTo(dist/2 - w, -w);
			ctx.lineTo(dist/2 - w, w);
			ctx.lineTo(dist/2 + w, 0);
			ctx.lineTo(dist/2 - w, -w);
			
			ctx.moveTo(dist/2 + w, -w);
			ctx.lineTo(dist/2 + w, w);
			
			ctx.moveTo(dist/2 + w, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[D] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	source_dc: createShapeDef('source_dc', {
		onDown: (x, y, style) => ({ type: 'source_dc', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			const w = 15;
			const gap = 3;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - gap, 0);
			
			ctx.moveTo(dist/2 - gap, -w);
			ctx.lineTo(dist/2 - gap, w);
			
			ctx.moveTo(dist/2 + gap, -w/2);
			ctx.lineTo(dist/2 + gap, w/2);
			
			ctx.moveTo(dist/2 + gap, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[battery1] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	source_ac: createShapeDef('source_ac', {
		onDown: (x, y, style) => ({ type: 'source_ac', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			const r = 15;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - r, 0);
			ctx.arc(dist/2, 0, r, 0, Math.PI * 2);
			
			ctx.moveTo(dist/2 - r/2, 0);
			ctx.bezierCurveTo(dist/2 - r/2, -r/2, dist/2, -r/2, dist/2, 0);
			ctx.bezierCurveTo(dist/2, r/2, dist/2 + r/2, r/2, dist/2 + r/2, 0);
			
			ctx.moveTo(dist/2 + r, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[sV] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	lamp: createShapeDef('lamp', {
		onDown: (x, y, style) => ({ type: 'lamp', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			const r = 12;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - r, 0);
			ctx.arc(dist/2, 0, r, 0, Math.PI * 2);
			
			const offset = r * Math.sin(Math.PI/4);
			ctx.moveTo(dist/2 - offset, -offset);
			ctx.lineTo(dist/2 + offset, offset);
			ctx.moveTo(dist/2 + offset, -offset);
			ctx.lineTo(dist/2 - offset, offset);
			
			ctx.moveTo(dist/2 + r, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[lamp] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	switch: createShapeDef('switch', {
		onDown: (x, y, style) => ({ type: 'switch', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			const gap = 15;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - gap, 0);
			ctx.arc(dist/2 - gap, 0, 2, 0, Math.PI*2);
			
			ctx.moveTo(dist/2 - gap, 0);
			ctx.lineTo(dist/2 + gap - 5, -10);
			
			ctx.moveTo(dist/2 + gap, 0);
			ctx.arc(dist/2 + gap, 0, 2, 0, Math.PI*2);
			ctx.moveTo(dist/2 + gap, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) to[switch] (${toTikZ(s.x2)},${toTikZ(s.y2, true)});`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	ground: createShapeDef('ground', {
		onDown: (x, y, style) => ({ type: 'ground', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const angle = Math.atan2(dy, dx);
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			const len = 20;
			ctx.moveTo(0, 0);
			ctx.lineTo(len, 0);
			
			ctx.moveTo(len, -10);
			ctx.lineTo(len, 10);
			
			ctx.moveTo(len + 4, -6);
			ctx.lineTo(len + 4, 6);
			
			ctx.moveTo(len + 8, -2);
			ctx.lineTo(len + 8, 2);
			
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => {
			const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI;
			return `\\draw (${toTikZ(s.x1)},${toTikZ(s.y1, true)}) node[ground, rotate=${angle-270}] {};`;
		},
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < UI_CONSTANTS.HIT_TOLERANCE + 5,
		isStandaloneCommand: true
	}),
	lens_convex: createShapeDef('lens_convex', {
		onDown: (x, y, style) => ({ type: 'lens_convex', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const rx = Math.abs(s.x2 - s.x1) / 2;
			const ry = Math.abs(s.y2 - s.y1) / 2;
			const cx = (s.x1 + s.x2) / 2;
			const cy = (s.y1 + s.y2) / 2;
			
			ctx.beginPath();
			ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
			
			ctx.beginPath();
			ctx.moveTo(cx, s.y1);
			ctx.lineTo(cx, s.y1 + 10);
			ctx.moveTo(cx - 5, s.y1 + 5);
			ctx.lineTo(cx, s.y1);
			ctx.lineTo(cx + 5, s.y1 + 5);
			
			ctx.moveTo(cx, s.y2);
			ctx.lineTo(cx, s.y2 - 10);
			ctx.moveTo(cx - 5, s.y2 - 5);
			ctx.lineTo(cx, s.y2);
			ctx.lineTo(cx + 5, s.y2 - 5);
			ctx.stroke();
		},
		toTikZ: (s) => {
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			return `\\draw[<->] (${cx}, ${cy - h/2}) -- (${cx}, ${cy + h/2}); \\draw (${cx}, ${cy}) ellipse (${w/2} and ${h/2});`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
	lens_concave: createShapeDef('lens_concave', {
		onDown: (x, y, style) => ({ type: 'lens_concave', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const cx = (s.x1 + s.x2) / 2;
			const cy = (s.y1 + s.y2) / 2;
			
			ctx.beginPath();
			ctx.moveTo(cx - w/2, s.y1);
			ctx.quadraticCurveTo(cx, cy, cx - w/2, s.y2);
			ctx.lineTo(cx + w/2, s.y2);
			ctx.quadraticCurveTo(cx, cy, cx + w/2, s.y1);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
			
			ctx.beginPath();
			ctx.moveTo(cx, s.y1); ctx.lineTo(cx, s.y1 + 10);
			ctx.moveTo(cx - 5, s.y1); ctx.lineTo(cx, s.y1 + 5); ctx.lineTo(cx + 5, s.y1);
			
			ctx.moveTo(cx, s.y2); ctx.lineTo(cx, s.y2 - 10);
			ctx.moveTo(cx - 5, s.y2); ctx.lineTo(cx, s.y2 - 5); ctx.lineTo(cx + 5, s.y2);
			ctx.stroke();
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			return `\\draw[>-<] (${cx}, ${cy - h/2}) -- (${cx}, ${cy + h/2});`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
	mirror: createShapeDef('mirror', {
		render: (s, ctx) => {
			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x2, s.y2);
			ctx.stroke();
			
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const len = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			const step = 10;
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			for(let i=0; i<len; i+=step) {
				ctx.moveTo(i, 0);
				ctx.lineTo(i - 5, 5);
			}
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1); const y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2); const y2 = toTikZ(s.y2, true);
			return `\\draw (${x1}, ${y1}) -- (${x2}, ${y2});\n	\\foreach \\i in {0,0.1,...,1} \\draw ([shift={(\\i*${x2-x1}, \\i*${y2-y1})}] ${x1}, ${y1}) -- ++(-135:0.15);`;
		},
		onDown: (x, y, style) => ({ type: 'mirror', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; }
	}),
	logic_and: createShapeDef('logic_and', {
		onDown: (x, y, style) => ({ type: 'logic_and', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + w/2, y);
			ctx.arc(x + w/2, y + h/2, h/2, -Math.PI/2, Math.PI/2);
			ctx.lineTo(x, y + h);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			return `\\node[and port, scale=${scale.toFixed(2)}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
	logic_or: createShapeDef('logic_or', {
		onDown: (x, y, style) => ({ type: 'logic_or', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.quadraticCurveTo(x + w/4, y + h/2, x, y + h);
			ctx.quadraticCurveTo(x + w*1.2, y + h, x + w, y + h/2);
			ctx.quadraticCurveTo(x + w*1.2, y, x, y);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			return `\\node[or port, scale=${scale.toFixed(2)}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
	logic_not: createShapeDef('logic_not', {
		onDown: (x, y, style) => ({ type: 'logic_not', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y + h);
			ctx.lineTo(x + w - 5, y + h/2);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
			
			ctx.beginPath();
			ctx.arc(x + w, y + h/2, 5, 0, Math.PI * 2);
			ctx.stroke();
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			return `\\node[not port, scale=${scale.toFixed(2)}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
	flow_start: createShapeDef('flow_start', {
		onDown: (x, y, style) => ({ type: 'flow_start', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			const r = Math.min(w, h) / 2;
			
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, r);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
			
			if (s.style.text) {
				ctx.fillStyle = s.style.stroke;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.font = '12px sans-serif';
				ctx.fillText(s.style.text, x + w/2, y + h/2);
			}
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const text = s.style.text || '';
			return `\\node[draw, rounded corners, minimum width=${w}cm, minimum height=${h}cm] at (${cx}, ${cy}) {${text}};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
	flow_process: createShapeDef('flow_process', {
		onDown: (x, y, style) => ({ type: 'flow_process', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			
			ctx.beginPath();
			ctx.rect(x, y, w, h);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
			
			if (s.style.text) {
				ctx.fillStyle = s.style.stroke;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.font = '12px sans-serif';
				ctx.fillText(s.style.text, x + w/2, y + h/2);
			}
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const text = s.style.text || '';
			return `\\node[draw, rectangle, minimum width=${w}cm, minimum height=${h}cm] at (${cx}, ${cy}) {${text}};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
	flow_decision: createShapeDef('flow_decision', {
		onDown: (x, y, style) => ({ type: 'flow_decision', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			const cx = x + w/2;
			const cy = y + h/2;
			
			ctx.beginPath();
			ctx.moveTo(cx, y);
			ctx.lineTo(x + w, cy);
			ctx.lineTo(cx, y + h);
			ctx.lineTo(x, cy);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
			
			if (s.style.text) {
				ctx.fillStyle = s.style.stroke;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.font = '12px sans-serif';
				ctx.fillText(s.style.text, cx, cy);
			}
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const text = s.style.text || '';
			return `\\node[draw, diamond, aspect=${(w/h).toFixed(2)}, minimum width=${w}cm, minimum height=${h}cm] at (${cx}, ${cy}) {${text}};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		})
	}),
};