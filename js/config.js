export const UI_CONSTANTS = {
	SCALE: 40,
	GRID_SIZE: 20,
	SELECTION_COLOR: '#5e6ad2',
	HANDLE_COLOR: '#ff4757',
	HANDLE_SIZE: 10,
	HANDLE_HIT_RADIUS: 12,
	ROTATION_HANDLE_OFFSET: 25,
	GRID_RENDER_COLOR: 'rgba(94, 106, 94, 0.3)',
	AXES_RENDER_COLOR: '#000000',
	AXIS_HELPER_COLOR: 'rgba(94, 106, 210, 0.2)',
	CONTROL_LINE_COLOR: '#9496a1',
	HIT_TOLERANCE: 8,
	SNAP_DISTANCE: 10,
	GUIDE_THRESHOLD: 5,
	ANCHOR_SNAP_RADIUS: 15,
	MIN_ZOOM: 0.1,
	MAX_ZOOM: 5
};

export const GLOBAL_SETTINGS_CONFIG = {
	genPreamble: {
		label: 'Générer Préambule',
		type: 'checkbox',
		defaultValue: false
	},
	docClass: {
		label: 'Classe',
		type: 'select',
		defaultValue: 'standalone',
		options: {
			'standalone': 'Standalone',
			'article': 'Article',
			'report': 'Report',
			'beamer': 'Beamer'
		}
	},
	globalLineWidth: {
		label: 'Trait Global',
		type: 'select',
		defaultValue: 'semithick',
		options: {
			'ultra thin': 'Ultra fin',
			'very thin': 'Très fin',
			'thin': 'Fin',
			'semithick': 'Demi-épais (Défaut)',
			'thick': 'Épais',
			'very thick': 'Très épais',
			'ultra thick': 'Ultra épais'
		}
	},
	globalArrow: {
		label: 'Flèche Globale',
		type: 'select',
		defaultValue: 'stealth',
		options: {
			'stealth': 'Stealth',
			'latex': 'LaTeX',
			'to': 'Standard',
			'triangle 45': 'Triangle',
			'circle': 'Cercle',
			'diamond': 'Losange'
		}
	},
	exportGrid: {
		label: 'Exporter Grille',
		type: 'checkbox',
		defaultValue: false
	},
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
		label: 'Zoom Grille (Vue)',
		type: 'range',
		defaultValue: 20,
		min: 10, max: 100, step: 5,
		unit: 'px'
	},
	stageColor: {
		label: 'Couleur de fond',
		type: 'color',
		defaultValue: '#eef1f5'
	}
};

export const TOOL_CONFIG = {
	select: {
		displayName: 'Sélection',
		handler: 'SelectTool',
		icon: '<i class="ti ti-pointer"></i>',
		cursor: 'default',
		group: 'general',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'rotate', 'textAnchor', 'textAlign', 'textWidth', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'gridStep', 'lineWidth', 'opacity', 'strokeColor', 'fillColor', 'starPoints', 'starRatio', 'polySides', 'waveType', 'waveAmplitude', 'waveLength', 'freehandMode', 'smoothness', 'cornerRadius', 'simplifyTolerance', 'isClosed']
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
		cursor: 'default',
		group: 'general',
		allow: []
	},
	lower: {
		displayName: 'Arrière plan',
		handler: 'LowerTool',
		icon: '<i class="ti ti-arrow-bar-to-down"></i>',
		cursor: 'default',
		group: 'general',
		allow: []
	},
	eyedropper: {
		displayName: 'Pipette',
		handler: 'EyedropperTool',
		icon: '<i class="ti ti-color-picker"></i>',
		cursor: 'cell',
		group: 'general',
		allow: []
	},
	point: {
		displayName: 'Point',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-target"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'textAnchor', 'pointSize', 'pointType', 'strokeColor', 'fillColor', 'opacity']
	},
	text: {
		displayName: 'Texte',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-text-size">T</i>',
		cursor: 'text',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'rotate', 'textSlant', 'textRotate', 'textAnchor', 'textAlign', 'textWidth', 'strokeColor', 'opacity']
	},
	freehand: {
		displayName: 'Crayon',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-pencil"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'freehandMode', 'smoothness', 'cornerRadius', 'simplifyTolerance', 'isClosed', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	line: {
		displayName: 'Ligne',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-line"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'arrowHead', 'rotate', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	rect: {
		displayName: 'Rectangle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-rectangle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	circle: {
		displayName: 'Cercle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-circle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	ellipse: {
		displayName: 'Ellipse',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-oval"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	triangle: {
		displayName: 'Triangle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	diamond: {
		displayName: 'Losange',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	grid: {
		displayName: 'Grille',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-grid-4x4"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['gridStep', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	axes: {
		displayName: 'Axes',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-axis-arrow"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'rotate', 'arrowHead', 'arrowScale', 'lineWidth', 'opacity', 'strokeColor']
	},
	arc: {
		displayName: 'Arc',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-angle-acute"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'rotate', 'arrowHead', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	curve: {
		displayName: 'Courbe',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-vector-curve"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'rotate', 'arrowHead', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	wave: {
		displayName: 'Onde',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-wave-sine"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'waveType', 'waveAmplitude', 'rotate', 'waveLength', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'lineWidth', 'opacity', 'strokeColor']
	},
	polygon: {
		displayName: 'Polygone',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-polygon"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'polySides', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	star: {
		displayName: 'Étoile',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-star"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'starPoints', 'starRatio', 'rotate', 'lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	resistor: {
		displayName: 'Résistance',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-wave-square"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'rotate', 'opacity', 'strokeColor']
	},
	capacitor: {
		displayName: 'Condensateur',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-pause"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'rotate']
	},
	inductor: {
		displayName: 'Bobine',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-infinity"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'rotate']
	},
	diode: {
		displayName: 'Diode',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-play" style="font-size: 0.7em;"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'rotate']
	},
	source_dc: {
		displayName: 'Source DC',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-car-battery"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	source_ac: {
		displayName: 'Source AC',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-water"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	lamp: {
		displayName: 'Lampe',
		handler: 'DrawingTool',
		icon: '<i class="fa-regular fa-lightbulb"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	switch: {
		displayName: 'Interrupteur',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-toggle-off"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	ground: {
		displayName: 'Masse',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-arrow-down"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	lens_convex: {
		displayName: 'Lentille Convergente',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-magnify"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	lens_concave: {
		displayName: 'Lentille Divergente',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-magnify-minus"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	mirror: {
		displayName: 'Miroir',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-mirror"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	logic_and: {
		displayName: 'Porte ET',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-and"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	logic_or: {
		displayName: 'Porte OU',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-or"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	logic_not: {
		displayName: 'Porte NON',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-not"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	flow_start: {
		displayName: 'Début/Fin',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-player-record"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	flow_process: {
		displayName: 'Processus',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-settings"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
	flow_decision: {
		displayName: 'Décision',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillColor']
	},
};

export const SETTINGS_CONFIG = {
	pointSize: {
		label: 'Taille du point',
		type: 'range',
		propName: 'pointSize',
		defaultValue: 3,
		min: 1, max: 20, step: 0.5,
		unit: 'pt',
		tikzValue: (v) => null
	},
	pointType: {
		label: 'Style de point',
		type: 'select',
		propName: 'pointType',
		defaultValue: 'dot',
		options: {
			'dot': 'Disque (Plein)',
			'circle': 'Cercle (Vide)',
			'cross': 'Croix (X)',
			'plus': 'Plus (+)'
		},
		tikzValue: (v) => null
	},
	textString: {
		label: 'Contenu',
		type: 'textarea',
		propName: 'text',
		defaultValue: '',
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
	rotate: {
		label: 'Rotation',
		type: 'range',
		propName: 'rotate',
		defaultValue: 0,
		min: 0, max: 360, step: 1,
		unit: '°',
		tikzValue: (v) => null
	},
	smoothness: {
		label: 'Lissage',
		type: 'range',
		propName: 'tension',
		defaultValue: 0.7,
		min: 0, max: 2, step: 0.1,
		unit: '',
		tikzKey: 'tension',
		excludeFrom: ['line', 'rect', 'circle', 'ellipse', 'triangle', 'diamond', 'grid', 'axes', 'arc', 'curve', 'wave', 'polygon', 'star', 'resistor', 'capacitor', 'inductor', 'diode', 'source_dc', 'source_ac', 'lamp', 'switch', 'ground', 'lens_convex', 'lens_concave', 'mirror', 'logic_and', 'logic_or', 'logic_not', 'flow_start', 'flow_process', 'flow_decision']
	},
	simplifyTolerance: {
		label: 'Simplification',
		type: 'range',
		propName: 'simplifyTolerance',
		defaultValue: 2,
		min: 0.1, max: 20, step: 0.1,
		unit: 'px',
		tikzValue: (v) => null
	},
	isClosed: {
		label: 'Fermer la forme',
		type: 'checkbox',
		propName: 'isClosed',
		defaultValue: false,
		tikzValue: (v) => null
	},
	freehandMode: {
		label: 'Type de tracé',
		type: 'select',
		propName: 'freehandMode',
		defaultValue: 'smooth',
		options: {
			'smooth': 'Courbe (Lissé)',
			'sharp': 'Linéaire (Brut)',
			'rounded': 'Arrondi'
		},
		tikzValue: (v) => null
	},
	cornerRadius: {
		label: 'Rayon des coins',
		type: 'range',
		propName: 'cornerRadius',
		defaultValue: 5,
		min: 1, max: 50, step: 1,
		unit: 'pt',
		tikzValue: (v) => null
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
		tikzValue: (v) => v ? 'double' : null
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
		tikzValue: (v) => v === 'none' ? null : v,
		excludeFrom: ['text', 'grid', 'resistor', 'capacitor', 'inductor', 'diode', 'source_dc', 'source_ac', 'lamp', 'switch', 'ground', 'lens_convex', 'lens_concave', 'mirror', 'logic_and', 'logic_or', 'logic_not', 'flow_start', 'flow_process', 'flow_decision']
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
		tikzValue: (v) => null,
		excludeFrom: ['text', 'grid']
	},
	arrowScale: {
		label: 'Taille de pointe',
		type: 'range',
		propName: 'arrowScale',
		defaultValue: 1,
		min: 0.5, max: 3, step: 0.1,
		unit: 'x',
		tikzValue: (v) => null,
		excludeFrom: ['text', 'grid']
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