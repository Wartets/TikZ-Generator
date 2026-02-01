import { translate, translateOptions } from './i18n.js';

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
		label: translate('genPreamble'),
		type: 'checkbox',
		defaultValue: false
	},
	obsidianMode: {
		label: translate('obsidianMode'),
		type: 'checkbox',
		defaultValue: false
	},
	docClass: {
		label: translate('docClass'),
		type: 'select',
		defaultValue: 'standalone',
		options: {
			'standalone': translate('standalone'),
			'article': translate('article'),
			'report': translate('report'),
			'beamer': translate('beamer')
		}
	},
	globalLineWidth: {
		label: translate('globalLineWidth'),
		type: 'select',
		defaultValue: 'semithick',
		options: {
			'ultra thin': translate('ultra thin'),
			'very thin': translate('very thin'),
			'thin': translate('thin'),
			'semithick': translate('semithick'),
			'thick': translate('thick'),
			'very thick': translate('very thick'),
			'ultra thick': translate('ultra thick')
		}
	},
	globalArrow: {
		label: translate('globalArrow'),
		type: 'select',
		defaultValue: 'stealth',
		options: {
			'stealth': translate('stealth'),
			'latex': translate('latex'),
			'to': translate('to'),
			'triangle 45': translate('triangle 45'),
			'circle': translate('circle'),
			'diamond': translate('diamond')
		}
	},
	exportGrid: {
		label: translate('exportGrid'),
		type: 'checkbox',
		defaultValue: false
	},
	figLabel: {
		label: translate('figLabel'),
		type: 'text',
		defaultValue: ''
	},
	figCaption: {
		label: translate('figCaption'),
		type: 'text',
		defaultValue: ''
	},
	figScale: {
		label: translate('figScale'),
		type: 'range',
		defaultValue: 1,
		min: 0.1, max: 3, step: 0.1,
		unit: 'x'
	},
	canvasZoom: {
		label: translate('canvasZoom'),
		type: 'range',
		defaultValue: 20,
		min: 10, max: 100, step: 5,
		unit: 'px'
	},
	stageColor: {
		label: translate('stageColor'),
		type: 'color',
		defaultValue: '#eef1f5'
	},
	gridMode: {
		label: translate('gridMode'),
		type: 'select',
		defaultValue: 'cartesian',
		options: {
			'cartesian': translate('cartesian'),
			'isometric': translate('isometric'),
			'polar': translate('polar')
		}
	},
	gridMagnetAngle: {
		label: translate('gridMagnetAngle'),
		type: 'range',
		defaultValue: 15,
		min: 1, max: 90, step: 1,
		unit: '°'
	}
};

export const TOOL_CONFIG = {
	select: {
		displayName: translate('select'),
		handler: 'SelectTool',
		icon: '<i class="ti ti-pointer"></i>',
		cursor: 'default',
		group: 'general',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'rotate', 'textAnchor', 'textAlign', 'textWidth', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'doubleLine', 'gridStep', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle', 'starPoints', 'starRatio', 'polySides', 'waveType', 'waveAmplitude', 'waveLength', 'freehandMode', 'smoothness', 'cornerRadius', 'simplifyTolerance', 'isClosed']
	},
	duplicate: {
		displayName: translate('duplicate'),
		handler: 'DuplicateTool',
		icon: '<i class="ti ti-copy"></i>',
		cursor: 'copy',
		group: 'general',
		allow: []
	},
	delete: {
		displayName: translate('delete'),
		handler: 'DeleteTool',
		icon: '<i class="ti ti-eraser"></i>',
		cursor: 'not-allowed',
		group: 'general',
		allow: []
	},
	raise: {
		displayName: translate('raise'),
		handler: 'RaiseTool',
		icon: '<i class="ti ti-arrow-bar-to-up"></i>',
		cursor: 'default',
		group: 'general',
		allow: []
	},
	lower: {
		displayName: translate('lower'),
		handler: 'LowerTool',
		icon: '<i class="ti ti-arrow-bar-to-down"></i>',
		cursor: 'default',
		group: 'general',
		allow: []
	},
	eyedropper: {
		displayName: translate('eyedropper'),
		handler: 'EyedropperTool',
		icon: '<i class="ti ti-color-picker"></i>',
		cursor: 'cell',
		group: 'general',
		allow: []
	},
	painter: {
		displayName: translate('painter'),
		handler: 'PainterTool',
		icon: '<i class="ti ti-brush"></i>',
		cursor: 'crosshair',
		group: 'general',
		allow: []
	},
	point: {
		displayName: translate('point'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-target"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 'textAnchor', 'pointSize', 'pointType', 'strokeColor', 'fillType', 'fillColor', 'opacity']
	},
	text: {
		displayName: translate('text'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-text-size">T</i>',
		cursor: 'text',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textFont', 'textWeight', 'rotate', 'textSlant', 'textRotate', 'textAnchor', 'textAlign', 'textWidth', 'strokeColor', 'opacity']
	},
	freehand: {
		displayName: translate('freehand'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-pencil"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'freehandMode', 'smoothness', 'cornerRadius', 'simplifyTolerance', 'isClosed', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	line: {
		displayName: translate('line'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-line"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'arrowHead', 'rotate', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	rect: {
		displayName: translate('rect'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-rectangle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	circle: {
		displayName: translate('circle'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-circle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	ellipse: {
		displayName: translate('ellipse'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-oval"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	triangle: {
		displayName: translate('triangle'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	diamond: {
		displayName: translate('diamond'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	grid: {
		displayName: translate('grid'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-grid-4x4"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['gridStep', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	axes: {
		displayName: translate('axes'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-axis-arrow"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'rotate', 'arrowHead', 'arrowScale', 'lineWidth', 'opacity', 'strokeColor']
	},
	arc: {
		displayName: translate('arc'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-angle-acute"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'rotate', 'arrowHead', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	curve: {
		displayName: translate('curve'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-vector-curve"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'arrowStyle', 'rotate', 'arrowHead', 'arrowScale', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor']
	},
	wave: {
		displayName: translate('wave'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-wave-sine"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'waveType', 'waveAmplitude', 'rotate', 'waveLength', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale', 'lineWidth', 'opacity', 'strokeColor']
	},
	polygon: {
		displayName: translate('polygon'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-polygon"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'polySides', 'lineStyle', 'doubleLine', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	star: {
		displayName: translate('star'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-star"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['textString', 'textSize', 'textAnchor', 'starPoints', 'starRatio', 'rotate', 'lineStyle', 'doubleLine', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	plot: {
		displayName: translate('plot'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-chart-line"></i>',
		cursor: 'crosshair',
		group: 'drawing',
		allow: ['plotFunction', 'plotDomainMin', 'plotDomainMax', 'plotYMin', 'plotYMax', 'plotSamples', 'plotXLabel', 'plotYLabel', 'plotGrid', 'plotAxisLines', 'plotMark', 'plotMarkSize', 'plotLegend', 'plotLegendPos', 'lineWidth', 'strokeColor', 'opacity', 'textSize', 'textColor', 'fillType', 'fillColor', 'fillColor2', 'textWeight', 'textSlant']
	},
	resistor: {
		displayName: translate('resistor'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-wave-square"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'rotate', 'opacity', 'strokeColor']
	},
	capacitor: {
		displayName: translate('capacitor'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-pause"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'rotate']
	},
	inductor: {
		displayName: translate('inductor'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-infinity"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'rotate']
	},
	diode: {
		displayName: translate('diode'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-play" style="font-size: 0.7em;"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'rotate']
	},
	source_dc: {
		displayName: translate('source_dc'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-circle-minus"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	source_ac: {
		displayName: translate('source_ac'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-water"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	battery: {
		displayName: translate('battery'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-car-battery"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	lamp: {
		displayName: translate('lamp'),
		handler: 'DrawingTool',
		icon: '<i class="fa-regular fa-lightbulb"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	switch: {
		displayName: translate('switch'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-toggle-off"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	ground: {
		displayName: translate('ground'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-arrow-down"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	ammeter: {
		displayName: translate('ammeter'),
		handler: 'DrawingTool',
		icon: '<span style="font-weight:bold; font-family:serif;">A</span>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	voltmeter: {
		displayName: translate('voltmeter'),
		handler: 'DrawingTool',
		icon: '<span style="font-weight:bold; font-family:serif;">V</span>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	transistor_npn: {
		displayName: translate('transistor_npn'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-transit-connection-variant"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	potentiometer: {
		displayName: translate('potentiometer'),
		handler: 'DrawingTool',
		icon: '<i class="fa-solid fa-sliders"></i>',
		cursor: 'crosshair',
		group: 'circuits',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	lens_convex: {
		displayName: translate('lens_convex'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-magnify"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	lens_concave: {
		displayName: translate('lens_concave'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-magnify-minus"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	mirror: {
		displayName: translate('mirror'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-mirror"></i>',
		cursor: 'crosshair',
		group: 'optics',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	logic_and: {
		displayName: translate('logic_and'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-and"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_or: {
		displayName: translate('logic_or'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-or"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_not: {
		displayName: translate('logic_not'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-not"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_nand: {
		displayName: translate('logic_nand'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-nand"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_nor: {
		displayName: translate('logic_nor'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-nor"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_xor: {
		displayName: translate('logic_xor'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-xor"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	logic_xnor: {
		displayName: translate('logic_xnor'),
		handler: 'DrawingTool',
		icon: '<i class="mdi mdi-gate-xnor"></i>',
		cursor: 'crosshair',
		group: 'logic',
		allow: ['textString', 'textSize', 'textAnchor', 'lineStyle', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	flow_start: {
		displayName: translate('flow_start'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-player-record"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	flow_process: {
		displayName: translate('flow_process'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-settings"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	flow_decision: {
		displayName: translate('flow_decision'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-diamond"></i>',
		cursor: 'crosshair',
		group: 'flowchart',
		allow: ['textString', 'textAnchor', 'rotate', 'textSize', 'lineStyle', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle']
	},
	spring: {
		displayName: translate('spring'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-wave-saw-tool"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	mass: {
		displayName: translate('mass'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-square"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor']
	},
	pulley: {
		displayName: translate('pulley'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-circle-dot"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor']
	},
	piston: {
		displayName: translate('piston'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-layers-intersect"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor']
	},
	field_mark: {
		displayName: translate('field_mark'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-plus"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['pointType', 'rotate', 'lineWidth', 'opacity', 'strokeColor']
	},
	wedge: {
		displayName: translate('wedge'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'wedgeAngle']
	},
	support: {
		displayName: translate('support'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-layout-bottombar"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'hatchAngle']
	},
	damper: {
		displayName: translate('damper'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-cylinder"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'damperWidth']
	},
	pendulum: {
		displayName: translate('pendulum'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-brand-pending"></i>',
		cursor: 'crosshair',
		group: 'physics',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'swingAngle', 'bobSize', 'pendulumLength']
	},
	repere_cartesian: {
		displayName: translate('repere_cartesian'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-axis-x-y-z"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'depth3d', 'angle3d', 'axisLenX', 'axisLenY', 'axisLenZ']
	},
	cube: {
		displayName: translate('cube'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-box"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
	cylinder_3d: {
		displayName: translate('cylinder_3d'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-cylinder"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d']
	},
	sphere_3d: {
		displayName: translate('sphere_3d'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-sphere"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'angle3d']
	},
	pyramid_3d: {
		displayName: translate('pyramid_3d'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-triangle-square-circle"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
	cone_3d: {
		displayName: translate('cone_3d'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-cone-2"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d']
	},
	prism_3d: {
		displayName: translate('prism_3d'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-box-model-2"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
	plane_3d: {
		displayName: translate('plane_3d'),
		handler: 'DrawingTool',
		icon: '<i class="ti ti-layers-intersect"></i>',
		cursor: 'crosshair',
		group: 'pseudo3d',
		allow: ['textString', 'textSize', 'rotate', 'lineWidth', 'opacity', 'strokeColor', 'fillType', 'fillColor', 'depth3d', 'angle3d']
	},
};

export const SETTINGS_CONFIG = {
	strokeColor: {
		label: translate('strokeColor'),
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
		label: translate('opacity'),
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
		label: translate('lineWidth'),
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
		label: translate('lineStyle'),
		type: 'select',
		propName: 'dash',
		defaultValue: 'solid',
		options: {
			solid: translate('solid'),
			dashed: translate('dashed'),
			dotted: translate('dotted'),
			'densely dashed': translate('densely dashed'),
		},
		tikzValue: (v) => v === 'solid' ? null : v,
		group: 'line-props'
	},
	rotate: {
		label: translate('rotate'),
		type: 'range',
		propName: 'rotate',
		defaultValue: 0,
		min: 0, max: 360, step: 1,
		unit: '°',
		tikzValue: (v) => null,
		group: 'transform'
	},
	doubleLine: {
		label: translate('doubleLine'),
		type: 'checkbox',
		propName: 'double',
		defaultValue: false,
		tikzValue: (v) => v ? 'double' : null,
		group: 'line-bools',
		groupOptions: { type: 'row' }
	},
	isClosed: {
		label: translate('isClosed'),
		type: 'checkbox',
		propName: 'isClosed',
		defaultValue: false,
		tikzValue: (v) => null,
		group: 'line-bools'
	},
	arrowStyle: {
		label: translate('arrowStyle'),
		type: 'select',
		propName: 'arrow',
		defaultValue: 'none',
		options: {
			none: translate('none'),
			'->': translate('->'),
			'<-': translate('<-'),
			'<->': translate('<->'),
		},
		tikzValue: (v) => v === 'none' ? null : v,
		excludeFrom: ['text', 'grid', 'resistor', 'capacitor', 'inductor', 'diode', 'source_dc', 'source_ac', 'lamp', 'switch', 'ground', 'lens_convex', 'lens_concave', 'mirror', 'logic_and', 'logic_or', 'logic_not', 'flow_start', 'flow_process', 'flow_decision'],
		group: 'arrows-main',
		groupOptions: { type: 'row' }
	},
	arrowHead: {
		label: translate('arrowHead'),
		type: 'select',
		propName: 'arrowHead',
		defaultValue: 'stealth',
		options: {
			'stealth': translate('stealth'),
			'latex': translate('latex'),
			'to': translate('to'),
			'triangle 45': translate('triangle 45'),
			'circle': translate('circle'),
			'diamond': translate('diamond')
		},
		tikzValue: (v) => null,
		excludeFrom: ['text', 'grid'],
		group: 'arrows-main'
	},
	arrowScale: {
		label: translate('arrowScale'),
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
		label: translate('fillType'),
		type: 'select',
		propName: 'fillType',
		defaultValue: 'none',
		options: {
			'none': translate('none'),
			'solid': translate('solid'),
			'linear': translate('linear'),
			'radial': translate('radial'),
			'ball': translate('ball')
		},
		tikzValue: (v) => null,
		group: 'fill-main',
		groupOptions: { type: 'row' }
	},
	shadingAngle: {
		label: translate('shadingAngle'),
		type: 'number',
		propName: 'shadingAngle',
		defaultValue: 0,
		step: 15,
		tikzValue: (v) => null,
		group: 'fill-main'
	},
	fillColor: {
		label: translate('fillColor'),
		type: 'color',
		propName: 'fill',
		defaultValue: '#5e6ad2',
		tikzValue: (v) => null,
		group: 'fill-colors',
		groupOptions: { type: 'row' }
	},
	fillColor2: {
		label: translate('fillColor2'),
		type: 'color',
		propName: 'fill2',
		defaultValue: '#ffffff',
		tikzValue: (v) => null,
		group: 'fill-colors'
	},
	cornerRadius: {
		label: translate('cornerRadius'),
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
		label: translate('smoothness'),
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
		label: translate('freehandMode'),
		type: 'select',
		propName: 'freehandMode',
		defaultValue: 'smooth',
		options: {
			'smooth': translate('smooth'),
			'sharp': translate('sharp'),
			'rounded': translate('rounded')
		},
		tikzValue: (v) => null,
		group: 'geo-mode'
	},
	simplifyTolerance: {
		label: translate('simplifyTolerance'),
		type: 'range',
		propName: 'simplifyTolerance',
		defaultValue: 2,
		min: 0.1, max: 20, step: 0.1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-mode'
	},
	polySides: {
		label: translate('polySides'),
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
		label: translate('starPoints'),
		type: 'range',
		propName: 'starPoints',
		defaultValue: 5,
		min: 3, max: 12, step: 1,
		unit: '',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	starRatio: {
		label: translate('starRatio'),
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
		label: translate('gridStep'),
		type: 'range',
		propName: 'gridStep',
		defaultValue: 0.5,
		min: 0.1, max: 2, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null,
		group: 'geo-ratio'
	},
	waveType: {
		label: translate('waveType'),
		type: 'select',
		propName: 'waveType',
		defaultValue: 'sine',
		options: {
			'sine': translate('sine'),
			'triangle': translate('triangle'),
			'square': translate('square'),
			'sawtooth': translate('sawtooth')
		},
		tikzValue: (v) => null,
		group: 'geo-wave',
		groupOptions: { type: 'row' }
	},
	waveAmplitude: {
		label: translate('waveAmplitude'),
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
		label: translate('waveLength'),
		type: 'range',
		propName: 'waveLength',
		defaultValue: 1,
		min: 0.1, max: 5, step: 0.1,
		unit: 'cm',
		tikzValue: (v) => null,
		group: 'geo-wave-props'
	},
	pointSize: {
		label: translate('pointSize'),
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
		label: translate('pointType'),
		type: 'select',
		propName: 'pointType',
		defaultValue: 'dot',
		options: {
			'dot': translate('dot'),
			'circle': translate('circle'),
			'cross': translate('cross'),
			'plus': translate('plus')
		},
		tikzValue: (v) => null,
		group: 'geo-point'
	},
	textString: {
		label: translate('textString'),
		type: 'textarea',
		propName: 'text',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'text-content'
	},
	textFont: {
		label: translate('textFont'),
		type: 'select',
		propName: 'textFont',
		defaultValue: 'sans',
		options: {
			'serif': translate('serif'),
			'sans': translate('sans'),
			'mono': translate('mono')
		},
		tikzValue: (v) => null,
		group: 'text-font',
		groupOptions: { type: 'row' }
	},
	textSize: {
		label: translate('textSize'),
		type: 'select',
		propName: 'textSize',
		defaultValue: 'normalsize',
		options: {
			'tiny': translate('tiny'),
			'scriptsize': translate('scriptsize'),
			'footnotesize': translate('footnotesize'),
			'small': translate('small'),
			'normalsize': translate('normalsize'),
			'large': translate('large'),
			'Large': translate('Large'),
			'LARGE': translate('LARGE'),
			'huge': translate('huge'),
			'Huge': translate('Huge')
		},
		tikzKey: 'font',
		tikzValue: (v) => v === 'normalsize' ? null : `\\${v}`,
		group: 'text-font'
	},
	textWeight: {
		label: translate('textWeight'),
		type: 'select',
		propName: 'textWeight',
		defaultValue: 'none',
		options: {
			'none': translate('none'),
			'bfseries': translate('bfseries')
		},
		tikzValue: (v) => null,
		group: 'text-style',
		groupOptions: { type: 'row' }
	},
	textSlant: {
		label: translate('textSlant'),
		type: 'select',
		propName: 'textSlant',
		defaultValue: 'none',
		options: {
			'none': translate('none'),
			'itshape': translate('itshape')
		},
		tikzValue: (v) => null,
		group: 'text-style'
	},
	textAnchor: {
		label: translate('textAnchor'),
		type: 'select',
		propName: 'textAnchor',
		defaultValue: 'center',
		options: {
			'center': translate('center'),
			'north': translate('north'),
			'south': translate('south'),
			'east': translate('east'),
			'west': translate('west'),
			'north east': translate('north east'),
			'north west': translate('north west'),
			'south east': translate('south east'),
			'south west': translate('south west')
		},
		tikzKey: 'anchor',
		tikzValue: (v) => v === 'center' ? null : v,
		group: 'text-align',
		groupOptions: { type: 'row' }
	},
	textAlign: {
		label: translate('textAlign'),
		type: 'select',
		propName: 'textAlign',
		defaultValue: 'center',
		options: {
			'left': translate('left'),
			'center': translate('center'),
			'right': translate('right'),
			'justify': translate('justify')
		},
		tikzKey: 'align',
		tikzValue: (v) => v === 'none' ? null : v,
		group: 'text-align'
	},
	textWidth: {
		label: translate('textWidth'),
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
		label: translate('textRotate'),
		type: 'number',
		propName: 'textRotate',
		defaultValue: 0,
		step: 5,
		group: 'text-pos'
	},
	plotFunction: {
		label: translate('plotFunction'),
		type: 'text',
		propName: 'plotFunction',
		defaultValue: 'sin(x)',
		tikzValue: (v) => null,
		group: 'plot-func'
	},
	plotDomainMin: {
		label: translate('plotDomainMin'),
		type: 'number',
		propName: 'plotDomainMin',
		defaultValue: -5,
		step: 0.1,
		tikzValue: (v) => null,
		group: 'plot-domain',
		groupOptions: { type: 'row' }
	},
	plotDomainMax: {
		label: translate('plotDomainMax'),
		type: 'number',
		propName: 'plotDomainMax',
		defaultValue: 5,
		step: 0.1,
		tikzValue: (v) => null,
		group: 'plot-domain'
	},
	plotYMin: {
		label: translate('plotYMin'),
		type: 'text',
		propName: 'plotYMin',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'plot-range',
		groupOptions: { type: 'row' }
	},
	plotYMax: {
		label: translate('plotYMax'),
		type: 'text',
		propName: 'plotYMax',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'plot-range'
	},
	plotSamples: {
		label: translate('plotSamples'),
		type: 'range',
		propName: 'plotSamples',
		defaultValue: 100,
		min: 10, max: 500, step: 10,
		unit: '',
		tikzValue: (v) => null,
		group: 'plot-detail'
	},
	plotGrid: {
		label: translate('plotGrid'),
		type: 'select',
		propName: 'plotGrid',
		defaultValue: 'major',
		options: {
			'none': translate('none'),
			'major': translate('major'),
			'both': translate('both')
		},
		tikzValue: (v) => null,
		group: 'plot-style',
		groupOptions: { type: 'row' }
	},
	plotAxisLines: {
		label: translate('plotAxisLines'),
		type: 'select',
		propName: 'plotAxisLines',
		defaultValue: 'box',
		options: {
			'box': translate('box'),
			'left': translate('left'),
			'middle': translate('middle'),
			'center': translate('center'),
			'none': translate('none')
		},
		tikzValue: (v) => null,
		group: 'plot-style'
	},
	plotXLabel: {
		label: translate('plotXLabel'),
		type: 'text',
		propName: 'plotXLabel',
		defaultValue: 'x',
		tikzValue: (v) => null,
		group: 'plot-labels',
		groupOptions: { type: 'row' }
	},
	plotYLabel: {
		label: translate('plotYLabel'),
		type: 'text',
		propName: 'plotYLabel',
		defaultValue: 'f(x)',
		tikzValue: (v) => null,
		group: 'plot-labels'
	},
	plotMark: {
		label: translate('plotMark'),
		type: 'select',
		propName: 'plotMark',
		defaultValue: 'none',
		options: {
			'none': translate('none'),
			'*': translate('point'),
			'x': translate('cross'),
			'+': translate('plus'),
			'o': translate('circle'),
			'square': translate('rect'),
			'triangle': translate('triangle')
		},
		tikzValue: (v) => null,
		group: 'plot-marks',
		groupOptions: { type: 'row' }
	},
	plotMarkSize: {
		label: translate('plotMarkSize'),
		type: 'range',
		propName: 'plotMarkSize',
		defaultValue: 2,
		min: 0.5, max: 5, step: 0.5,
		unit: 'pt',
		tikzValue: (v) => null,
		group: 'plot-marks'
	},
	plotLegend: {
		label: translate('plotLegend'),
		type: 'text',
		propName: 'plotLegend',
		defaultValue: '',
		tikzValue: (v) => null,
		group: 'plot-legend'
	},
	plotLegendPos: {
		label: translate('plotLegendPos'),
		type: 'select',
		propName: 'plotLegendPos',
		defaultValue: 'north east',
		options: {
			'north east': translate('north east'),
			'north west': translate('north west'),
			'south east': translate('south east'),
			'south west': translate('south west'),
			'outer north east': translate('outer north east')
		},
		tikzValue: (v) => null,
		group: 'plot-legend'
	},
	depth3d: {
		label: translate('depth3d'),
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
		label: translate('angle3d'),
		type: 'range',
		propName: 'angle3d',
		defaultValue: 45,
		min: 2, max: 180, step: 2,
		unit: '°',
		tikzValue: (v) => null,
		group: 'geo-3d'
	},
	axisLenX: {
		label: translate('axisLenX'),
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
		label: translate('axisLenY'),
		type: 'range',
		propName: 'axisLenY',
		defaultValue: 60,
		min: 1, max: 500, step: 1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-3d-axes'
	},
	axisLenZ: {
		label: translate('axisLenZ'),
		type: 'range',
		propName: 'axisLenZ',
		defaultValue: 80,
		min: 1, max: 500, step: 1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-3d-axes'
	},
	wedgeAngle: {
		label: translate('wedgeAngle'),
		type: 'range',
		propName: 'wedgeAngle',
		defaultValue: 30,
		min: 5, max: 85, step: 1,
		unit: '°',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	hatchAngle: {
		label: translate('hatchAngle'),
		type: 'range',
		propName: 'hatchAngle',
		defaultValue: 45,
		min: -90, max: 90, step: 15,
		unit: '°',
		tikzValue: (v) => null,
		group: 'fill-main'
	},
	damperWidth: {
		label: translate('damperWidth'),
		type: 'range',
		propName: 'damperWidth',
		defaultValue: 10,
		min: 5, max: 30, step: 1,
		unit: 'pt',
		tikzValue: (v) => null,
		group: 'geo-ratio'
	},
	swingAngle: {
		label: translate('swingAngle'),
		type: 'range',
		propName: 'swingAngle',
		defaultValue: -30,
		min: -180, max: 180, step: 1,
		unit: '°',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	pendulumLength: {
		label: translate('pendulumLength'),
		type: 'range',
		propName: 'pendulumLength',
		defaultValue: 100,
		min: 10, max: 300, step: 10,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
	bobSize: {
		label: translate('bobSize'),
		type: 'range',
		propName: 'bobSize',
		defaultValue: 10,
		min: 2, max: 40, step: 1,
		unit: 'px',
		tikzValue: (v) => null,
		group: 'geo-poly'
	},
};