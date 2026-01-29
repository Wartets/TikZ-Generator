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
	MAX_ZOOM: 5,
	SELECTION_WINDOW_FILL: 'rgba(94, 106, 210, 0.1)',
	SELECTION_WINDOW_STROKE: '#5e6ad2',
	SELECTION_CROSSING_FILL: 'rgba(46, 204, 113, 0.1)',
	SELECTION_CROSSING_STROKE: '#27ae60'
};

export const GLOBAL_SETTINGS_CONFIG = {
	genPreamble: {
		label: 'Générer Préambule',
		type: 'checkbox',
		defaultValue: false
	},
	obsidianMode: {
		label: 'Mode Obsidian (TikZJax)',
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
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'rotate', 'textAnchor', 'textAlign', 'textWidth', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'gridStep', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle', 'starPoints', 'starRatio', 'polySides', 'waveType', 'waveAmplitude', 'waveLength', 'freehandMode', 'smoothness', 'cornerRadius', 'simplifyTolerance', 'isClosed']
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
	painter: {
		displayName: 'Pinceau de style',
		handler: 'PainterTool',
		icon: '<i class="ti ti-brush"></i>',
		cursor: 'crosshair',
		group: 'general',
		allow: []
	},
	point: {
		displayName: 'Point',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-target"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'textAnchor', 'pointSize', 'pointType', 'strokeColor', 'fillType', 'fillColor', 'opacity']
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
		allow: ['textString', 'textSize', 'textAnchor', 'freehandMode', 'smoothness', 'cornerRadius', 'simplifyTolerance', 'isClosed', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
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
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	circle: {
		displayName: 'Cercle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-circle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	ellipse: {
		displayName: 'Ellipse',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-oval"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	triangle: {
		displayName: 'Triangle',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	diamond: {
		displayName: 'Losange',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
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
		allow: ['textString', 'textSize', 'textAnchor', 'polySides', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	star: {
		displayName: 'Étoile',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-star"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'starPoints', 'starRatio', 'rotate', 'lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	plot: {
		displayName: 'Graphique',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-chart-line"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['plotFunction', 'plotDomainMin', 'plotDomainMax', 'plotYMin', 'plotYMax', 'plotSamples', 'plotXLabel', 'plotYLabel', 'plotGrid', 'plotAxisLines', 'plotMark', 'plotMarkSize', 'plotLegend', 'plotLegendPos', 'lineWidth', 'strokeColor', 'opacity', 'textSize', 'textColor', 'fillType', 'fillColor', 'fillColor2', 'textWeight', 'textSlant']
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
		icon: '<i class="fa-solid fa-circle-minus"></i>',
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
	battery: {
		displayName: 'Batterie',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-car-battery"></i>',
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
	ammeter: {
		displayName: 'Ampèremètre',
		handler: 'DrawingTool',
		icon: '<span style="font-weight:bold; font-family:serif;">A</span>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	voltmeter: {
		displayName: 'Voltmètre',
		handler: 'DrawingTool',
		icon: '<span style="font-weight:bold; font-family:serif;">V</span>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	transistor_npn: {
		displayName: 'Transistor NPN',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-transit-connection-variant"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	potentiometer: {
		displayName: 'Potentiomètre',
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-sliders"></i>',
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
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	lens_concave: {
		displayName: 'Lentille Divergente',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-magnify-minus"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
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
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_or: {
		displayName: 'Porte OU',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-or"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_not: {
		displayName: 'Porte NON',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-not"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_nand: {
		displayName: 'Porte NON-ET',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-nand"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_nor: {
		displayName: 'Porte NON-OU',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-nor"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_xor: {
		displayName: 'Porte OU-X',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-xor"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_xnor: {
		displayName: 'Porte NON-OU-X',
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-xnor"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	flow_start: {
		displayName: 'Début/Fin',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-player-record"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	flow_process: {
		displayName: 'Processus',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-settings"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	flow_decision: {
		displayName: 'Décision',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	spring: {
		displayName: 'Ressort',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-wave-saw-tool"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	mass: {
		displayName: 'Masse',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-square"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor']
	},
	pulley: {
		displayName: 'Poulie',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-circle-dot"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor']
	},
	piston: {
		displayName: 'Piston',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-layers-intersect"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor']
	},
	field_mark: {
		displayName: 'Champ B',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-plus"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['pointType', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	wedge: {
		displayName: 'Plan Incliné',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'wedgeAngle']
	},
	support: {
		displayName: 'Support/Mur',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-layout-bottombar"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'hatchAngle']
	},
	damper: {
		displayName: 'Amortisseur',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-cylinder"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'damperWidth']
	},
	pendulum: {
		displayName: 'Pendule',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-brand-pending"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'swingAngle', 'bobSize', 'pendulumLength']
	},
	repere_cartesian: {
		displayName: 'Repère 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-axis-x-y-z"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'depth3d', 'angle3d', 'axisLenX', 'axisLenY', 'axisLenZ']
	},
	cube: {
		displayName: 'Pavé 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-box"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
	cylinder_3d: {
		displayName: 'Cylindre 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-cylinder"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d']
	},
	sphere_3d: {
		displayName: 'Sphère 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-sphere"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'angle3d']
	},
	pyramid_3d: {
		displayName: 'Pyramide 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle-square-circle"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
	cone_3d: {
		displayName: 'Cône 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-cone-2"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d']
	},
	prism_3d: {
		displayName: 'Prisme 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-box-model-2"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
	plane_3d: {
		displayName: 'Plan 3D',
		handler: 'DrawingTool',
		icon: '<i class="ti ti-layers-intersect"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
};

export const SETTINGS_CONFIG = {
	strokeColor: {
		label: 'Contour',
		type: 'color',
		propName: 'stroke',
		defaultValue: '#000000',
		tikzKey: 'draw',
		isColor: true,
		tikzValue: (v) => v === '#000000' ? null : v,
		group: 'main-style',
		groupOptions: { type: 'row' }
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
		group: 'main-style'
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
		tikzValue: (v) => v === 1 ? null : v,
		group: 'line-props',
		groupOptions: { type: 'row' }
	},
	lineStyle: {
		label: 'Style trait',
		type: 'select',
		propName: 'dash',
		defaultValue: 'solid',
		options: {
			solid: 'Plein',
			dashed: 'Tirets',
			dotted: 'Points',
			'densely dashed': 'Serré',
		},
		tikzValue: (v) => v === 'solid' ? null : v,
		group: 'line-props'
	},
	rotate: {
		label: 'Rotation Forme',
		type: 'range',
		propName: 'rotate',
		defaultValue: 0,
		min: 0, max: 360, step: 1,
		unit: '°',
		tikzValue: (v) => null,
		group: 'transform'
	},
	doubleLine: {
		label: 'Double',
		type: 'checkbox',
		propName: 'double',
		defaultValue: false,
		tikzValue: (v) => v ? 'double' : null,
		group: 'line-bools',
		groupOptions: { type: 'row' }
	},
	isClosed: {
		label: 'Fermé',
		type: 'checkbox',
		propName: 'isClosed',
		defaultValue: false,
		tikzValue: (v) => null,
		group: 'line-bools'
	},
	arrowStyle: {
		label: 'Flèches',
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
		excludeFrom: ['text', 'grid', 'resistor', 'capacitor', 'inductor', 'diode', 'source_dc', 'source_ac', 'lamp', 'switch', 'ground', 'lens_convex', 'lens_concave', 'mirror', 'logic_and', 'logic_or', 'logic_not', 'flow_start', 'flow_process', 'flow_decision'],
		group: 'arrows-main',
		groupOptions: { type: 'row' }
	},
	arrowHead: {
		label: 'Pointe',
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
		excludeFrom: ['text', 'grid'],
		group: 'arrows-main'
	},
	arrowScale: {
		label: 'Taille Pointe',
		type: 'range',
		propName: 'arrowScale',
		defaultValue: 1,
		min: 0.5, max: 3, step: 0.1,
		unit: 'x',
		tikzValue: (v) => null,
		excludeFrom: ['text', 'grid'],
		group: 'arrows-size'
	},
	fillType: {
		label: 'Remplissage',
		type: 'select',
		propName: 'fillType',
		defaultValue: 'none',
		options: {
			'none': 'Aucun',
			'solid': 'Uni',
			'linear': 'Linéaire',
			'radial': 'Radial',
			'ball': 'Ball'
		},
		tikzValue: (v) => null,
		group: 'fill-main',
		groupOptions: { type: 'row' }
	},
	shadingAngle: {
		label: 'Angle',
		type: 'number',
		propName: 'shadingAngle',
		defaultValue: 0,
		step: 15,
		tikzValue: (v) => null,
		group: 'fill-main'
	},
	fillColor: {
		label: 'Couleur 1',
		type: 'color',
		propName: 'fill',
		defaultValue: '#5e6ad2',
		tikzValue: (v) => null,
		group: 'fill-colors',
		groupOptions: { type: 'row' }
	},
	fillColor2: {
		label: 'Couleur 2',
		type: 'color',
		propName: 'fill2',
		defaultValue: '#ffffff',
		tikzValue: (v) => null,
		group: 'fill-colors'
	},
	cornerRadius: {
		label: 'Arrondi',
		type: 'range',
		propName: 'cornerRadius',
		defaultValue: 5,
		min: 0, max: 50, step: 1,
		unit: 'pt',
		tikzValue: (v) => null,
		group: 'geo-smooth',
		groupOptions: { type: 'row' }
	},
	smoothness: {
		label: 'Lissage',
		type: 'range',
		propName: 'tension',
		defaultValue: 0.7,
		min: 0, max: 2, step: 0.1,
		unit: '',
		tikzKey: 'tension',
		excludeFrom: ['line', 'rect', 'circle', 'ellipse', 'triangle', 'diamond', 'grid', 'axes', 'arc', 'curve', 'wave', 'polygon', 'star', 'resistor', 'capacitor', 'inductor', 'diode', 'source_dc', 'source_ac', 'lamp', 'switch', 'ground', 'lens_convex', 'lens_concave', 'mirror', 'logic_and', 'logic_or', 'logic_not', 'flow_start', 'flow_process', 'flow_decision'],
		group: 'geo-smooth'
	},
	freehandMode: {
		label: 'Mode Traçé',
		type: 'select',
		propName: 'freehandMode',
		defaultValue: 'smooth',
		options: {
			'smooth': 'Lissé',
			'sharp': 'Brut',
			'rounded': 'Arrondi'
		},
		tikzValue: (v) => null,
		group: 'geo-mode'
	},
	simplifyTolerance: {
		label: 'Simplification',
		type: 'range',
		propName: 'simplifyTolerance',
		defaultValue: 2,
		min: 0.1, max: 20, step: 0.1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-mode'
	},
	polySides: {
		label: 'Côtés',
		type: 'range',
		propName: 'polySides',
		defaultValue: 5,
		min: 3, max: 12, step: 1,
		unit: '',
		tikzValue: (v) => null,
		group: 'geo-poly',
		groupOptions: { type: 'row' }
	},
	starPoints: {
		label: 'Pointes',
		type: 'range',
		propName: 'starPoints',
		defaultValue: 5,
		min: 3, max: 12, step: 1,
		unit: '',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	starRatio: {
		label: 'Ratio Étoile',
		type: 'range',
		propName: 'starRatio',
		defaultValue: 0.5,
		min: 0.1, max: 0.9, step: 0.1,
		unit: '',
		tikzValue: (v) => null,
		group: 'geo-ratio',
		groupOptions: { type: 'row' }
	},
	gridStep: {
		label: 'Pas Grille',
		type: 'range',
		propName: 'gridStep',
		defaultValue: 0.5,
		min: 0.1, max: 2, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null,
		group: 'geo-ratio'
	},
	waveType: {
		label: 'Type Onde',
		type: 'select',
		propName: 'waveType',
		defaultValue: 'sine',
		options: {
			'sine': 'Sinus',
			'triangle': 'Triangle',
			'square': 'Carré',
			'sawtooth': 'Scie'
		},
		tikzValue: (v) => null,
		group: 'geo-wave',
		groupOptions: { type: 'row' }
	},
	waveAmplitude: {
		label: 'Amplitude',
		type: 'range',
		propName: 'waveAmplitude',
		defaultValue: 0.5,
		min: 0.1, max: 5, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null,
		group: 'geo-wave-props',
		groupOptions: { type: 'row' }
	},
	waveLength: {
		label: 'Longueur',
		type: 'range',
		propName: 'waveLength',
		defaultValue: 1,
		min: 0.1, max: 5, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null,
		group: 'geo-wave-props'
	},
	pointSize: {
		label: 'Taille Point',
		type: 'range',
		propName: 'pointSize',
		defaultValue: 3,
		min: 1, max: 20, step: 0.5,
		unit: 'pt',
		tikzValue: (v) => null,
		group: 'geo-point',
		groupOptions: { type: 'row' }
	},
	pointType: {
		label: 'Style Point',
		type: 'select',
		propName: 'pointType',
		defaultValue: 'dot',
		options: {
			'dot': 'Plein',
			'circle': 'Vide',
			'cross': 'Croix',
			'plus': 'Plus'
		},
		tikzValue: (v) => null,
		group: 'geo-point'
	},
	textString: {
		label: 'Contenu Texte',
		type: 'textarea',
		propName: 'text',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'text-content'
	},
	textFont: {
		label: 'Police',
		type: 'select',
		propName: 'textFont',
		defaultValue: 'sans',
		options: {
			'serif': 'Serif',
			'sans': 'Sans',
			'mono': 'Mono'
		},
		tikzValue: (v) => null,
		group: 'text-font',
		groupOptions: { type: 'row' }
	},
	textSize: {
		label: 'Taille',
		type: 'select',
		propName: 'textSize',
		defaultValue: 'normalsize',
		options: {
			'tiny': 'Tiny',
			'scriptsize': 'Script',
			'footnotesize': 'Foot',
			'small': 'Small',
			'normalsize': 'Normal',
			'large': 'Large',
			'Large': 'Large+',
			'LARGE': 'LARGE',
			'huge': 'Huge',
			'Huge': 'Huge+'
		},
		tikzKey: 'font',
		tikzValue: (v) => v === 'normalsize' ? null : `\\${v}`,
		group: 'text-font'
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
		tikzValue: (v) => null,
		group: 'text-style',
		groupOptions: { type: 'row' }
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
		tikzValue: (v) => null,
		group: 'text-style'
	},
	textAnchor: {
		label: 'Ancrage',
		type: 'select',
		propName: 'textAnchor',
		defaultValue: 'center',
		options: {
			'center': 'Centre',
			'north': 'Nord',
			'south': 'Sud',
			'east': 'Est',
			'west': 'Ouest',
			'north east': 'NE',
			'north west': 'NO',
			'south east': 'SE',
			'south west': 'SO'
		},
		tikzKey: 'anchor',
		tikzValue: (v) => v === 'center' ? null : v,
		group: 'text-align',
		groupOptions: { type: 'row' }
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
		tikzValue: (v) => v === 'none' ? null : v,
		group: 'text-align'
	},
	textWidth: {
		label: 'Largeur (cm)',
		type: 'range',
		propName: 'textWidth',
		defaultValue: 0,
		min: 0, max: 10, step: 0.5,
		unit: 'cm',
		tikzKey: 'text width',
		tikzSuffix: 'cm',
		tikzValue: (v) => v === 0 ? null : v,
		group: 'text-pos',
		groupOptions: { type: 'row' }
	},
	textRotate: {
		label: 'Rotation Txt',
		type: 'number',
		propName: 'textRotate',
		defaultValue: 0,
		step: 5,
		group: 'text-pos'
	},
	plotFunction: {
		label: 'Fonction f(x)',
		type: 'text',
		propName: 'plotFunction',
		defaultValue: 'sin(x)',
		tikzValue: (v) => null,
		group: 'plot-func'
	},
	plotDomainMin: {
		label: 'Min X',
		type: 'number',
		propName: 'plotDomainMin',
		defaultValue: -5,
		step: 0.1,
		tikzValue: (v) => null,
		group: 'plot-domain',
		groupOptions: { type: 'row' }
	},
	plotDomainMax: {
		label: 'Max X',
		type: 'number',
		propName: 'plotDomainMax',
		defaultValue: 5,
		step: 0.1,
		tikzValue: (v) => null,
		group: 'plot-domain'
	},
	plotYMin: {
		label: 'Min Y',
		type: 'text',
		propName: 'plotYMin',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'plot-range',
		groupOptions: { type: 'row' }
	},
	plotYMax: {
		label: 'Max Y',
		type: 'text',
		propName: 'plotYMax',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'plot-range'
	},
	plotSamples: {
		label: 'Échantillons',
		type: 'range',
		propName: 'plotSamples',
		defaultValue: 100,
		min: 10, max: 500, step: 10,
		unit: '',
		tikzValue: (v) => null,
		group: 'plot-detail'
	},
	plotGrid: {
		label: 'Grille',
		type: 'select',
		propName: 'plotGrid',
		defaultValue: 'major',
		options: {
			'none': 'Aucune',
			'major': 'Principale',
			'both': 'Complète'
		},
		tikzValue: (v) => null,
		group: 'plot-style',
		groupOptions: { type: 'row' }
	},
	plotAxisLines: {
		label: 'Axes',
		type: 'select',
		propName: 'plotAxisLines',
		defaultValue: 'box',
		options: {
			'box': 'Boîte',
			'left': 'Gauche/Bas',
			'middle': 'Croix',
			'center': 'Centré',
			'none': 'Aucun'
		},
		tikzValue: (v) => null,
		group: 'plot-style'
	},
	plotXLabel: {
		label: 'Label X',
		type: 'text',
		propName: 'plotXLabel',
		defaultValue: 'x',
		tikzValue: (v) => null,
		group: 'plot-labels',
		groupOptions: { type: 'row' }
	},
	plotYLabel: {
		label: 'Label Y',
		type: 'text',
		propName: 'plotYLabel',
		defaultValue: 'f(x)',
		tikzValue: (v) => null,
		group: 'plot-labels'
	},
	plotMark: {
		label: 'Marqueur',
		type: 'select',
		propName: 'plotMark',
		defaultValue: 'none',
		options: {
			'none': 'Aucun',
			'*': 'Point',
			'x': 'Croix',
			'+': 'Plus',
			'o': 'Cercle',
			'square': 'Carré',
			'triangle': 'Triangle'
		},
		tikzValue: (v) => null,
		group: 'plot-marks',
		groupOptions: { type: 'row' }
	},
	plotMarkSize: {
		label: 'Taille Marq.',
		type: 'range',
		propName: 'plotMarkSize',
		defaultValue: 2,
		min: 0.5, max: 5, step: 0.5,
		unit: 'pt',
		tikzValue: (v) => null,
		group: 'plot-marks'
	},
	plotLegend: {
		label: 'Légende',
		type: 'text',
		propName: 'plotLegend',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'plot-legend'
	},
	plotLegendPos: {
		label: 'Pos. Légende',
		type: 'select',
		propName: 'plotLegendPos',
		defaultValue: 'north east',
		options: {
			'north east': 'Nord-Est',
			'north west': 'Nord-Ouest',
			'south east': 'Sud-Est',
			'south west': 'Sud-Ouest',
			'outer north east': 'Ext. NE'
		},
		tikzValue: (v) => null,
		group: 'plot-legend'
	},
	depth3d: {
		label: 'Profondeur',
		type: 'range',
		propName: 'depth3d',
		defaultValue: 20,
		min: 0.2, max: 100, step: 0.2,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-3d',
		groupOptions: { type: 'row' }
	},
	angle3d: {
		label: 'Angle 3D',
		type: 'range',
		propName: 'angle3d',
		defaultValue: 45,
		min: 2, max: 180, step: 2,
		unit: '°',
		tikzValue: (v) => null,
		group: 'geo-3d'
	},
	axisLenX: {
		label: 'Longueur X',
		type: 'range',
		propName: 'axisLenX',
		defaultValue: 80,
		min: 1, max: 500, step: 1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-3d-axes',
		groupOptions: { type: 'row' }
	},
	axisLenY: {
		label: 'Longueur Y',
		type: 'range',
		propName: 'axisLenY',
		defaultValue: 60,
		min: 1, max: 500, step: 1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-3d-axes'
	},
	axisLenZ: {
		label: 'Longueur Z',
		type: 'range',
		propName: 'axisLenZ',
		defaultValue: 80,
		min: 1, max: 500, step: 1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-3d-axes'
	},
	wedgeAngle: {
		label: 'Angle Pente',
		type: 'range',
		propName: 'wedgeAngle',
		defaultValue: 30,
		min: 5, max: 85, step: 1,
		unit: '°',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	hatchAngle: {
		label: 'Angle Hachures',
		type: 'range',
		propName: 'hatchAngle',
		defaultValue: 45,
		min: -90, max: 90, step: 15,
		unit: '°',
		tikzValue: (v) => null,
		group: 'fill-main'
	},
	damperWidth: {
		label: 'Largeur Amort.',
		type: 'range',
		propName: 'damperWidth',
		defaultValue: 10,
		min: 5, max: 30, step: 1,
		unit: 'pt',
		tikzValue: (v) => null,
		group: 'geo-ratio'
	},
	swingAngle: {
		label: 'Angle Pendule',
		type: 'range',
		propName: 'swingAngle',
		defaultValue: -30,
		min: -180, max: 180, step: 1,
		unit: '°',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	pendulumLength: {
		label: 'Longueur Fil',
		type: 'range',
		propName: 'pendulumLength',
		defaultValue: 100,
		min: 10, max: 300, step: 10,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	bobSize: {
		label: 'Taille Masse',
		type: 'range',
		propName: 'bobSize',
		defaultValue: 10,
		min: 2, max: 40, step: 1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
};