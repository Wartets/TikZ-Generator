import { app } from './state.js';
import { SETTINGS_CONFIG } from './config.js';
import { output } from './ui.js';
import { ShapeManager, getShapeCenter } from './shapes.js';
import { toTikZ } from './utils.js';

export function buildTikzOptions(s) {
	let opts = [];
	const style = s.style;

	if (style.arrow && style.arrow !== 'none' && !['text', 'grid'].includes(s.type)) {
		const head = style.arrowHead ? style.arrowHead.charAt(0).toUpperCase() + style.arrowHead.slice(1) : 'Stealth';
		const scale = style.arrowScale || 1;
		let headStr = head === 'Triangle 45' ? 'Triangle[angle=45:1pt]' : (head === 'To' ? 'To' : head);
		opts.push(scale !== 1 ? `>={${headStr}[scale=${scale}]}` : `>={${headStr}}`);
	}

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		if (config.excludeFrom && config.excludeFrom.includes(s.type)) continue;
		if (['arrowHead', 'arrowScale', 'textWeight', 'textSlant', 'textFont', 'fillType', 'fillColor', 'fillColor2', 'shadingAngle'].includes(key)) continue;

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

	if (style.fillType && style.fillType !== 'none') {
		const c1 = app.colors.get(style.fill) || style.fill;
		const c2 = app.colors.get(style.fill2) || style.fill2;
		const angle = style.shadingAngle || 0;

		if (style.fillType === 'solid') {
			opts.push(`fill=${c1}`);
		} else if (style.fillType === 'linear') {
			opts.push(`shading=axis, top color=${c1}, bottom color=${c2}, shading angle=${angle}`);
		} else if (style.fillType === 'radial') {
			opts.push(`shading=radial, inner color=${c1}, outer color=${c2}`);
		} else if (style.fillType === 'ball') {
			opts.push(`shading=ball, ball color=${c1}`);
		}
	}
	
	if (style.rotate && style.rotate !== 0) {
		const center = getShapeCenter(s);
		const cx = toTikZ(center.x, false);
		const cy = toTikZ(center.y, true);
		opts.push(`rotate around={${-style.rotate}:(${cx},${cy})}`);
	}
	
	return opts.length ? `[${opts.join(', ')}]` : '';
}

export function generateCode() {
	let out = "";
	const style = app.drawingStyle;
	const usePreamble = style.genPreamble;
	const docClass = style.docClass || 'standalone';
	const useFigure = (style.figCaption || style.figLabel) && docClass !== 'standalone';
	
	const packages = new Set(['tikz']);
	const libraries = new Set();
	
	const hasCircuits = app.shapes.some(s => ['resistor', 'capacitor', 'inductor', 'diode', 'source_dc', 'source_ac', 'battery', 'lamp', 'switch', 'ground', 'ammeter', 'voltmeter', 'transistor_npn', 'potentiometer'].includes(s.type));
	if (hasCircuits) packages.add('circuitikz');

	const hasGeometric = app.shapes.some(s => ['star', 'diamond', 'ellipse', 'polygon', 'flow_decision'].includes(s.type));
	if (hasGeometric) libraries.add('shapes.geometric');

	const hasArrows = app.shapes.some(s => s.style.arrow && s.style.arrow !== 'none');
	if (hasArrows || style.globalArrow) libraries.add('arrows.meta');

	const hasPlots = app.shapes.some(s => s.type === 'plot');
	if (hasPlots) {
		packages.add('pgfplots');
	}

	const hasLogic = app.shapes.some(s => s.type.startsWith('logic_'));
	if (hasLogic) {
		libraries.add('circuits.logic.US');
		libraries.add('positioning');
	}

	const has3D = app.shapes.some(s => ['cube', 'repere_cartesian', 'cylinder_3d', 'sphere_3d'].includes(s.type));
	if (has3D) {
		libraries.add('arrows.meta');
		libraries.add('angles');
	}

	const hasSpring = app.shapes.some(s => s.type === 'spring');
	if (hasSpring) libraries.add('decorations.pathmorphing');

	if (app.shapes.some(s => s.style.freehandMode === 'rounded')) libraries.add('calc');

	if (usePreamble) {
		let classOpts = '';
		if (docClass === 'standalone') classOpts = '[tikz, border=10pt]';
		out += `\\documentclass${classOpts}{${docClass}}\n`;
		
		if (docClass !== 'standalone') {
			out += "\\usepackage[utf8]{inputenc}\n";
			out += "\\usepackage[T1]{fontenc}\n";
		}
		
		packages.forEach(p => {
			if (docClass === 'standalone' && p === 'tikz') return;
			out += `\\usepackage{${p}}\n`;
		});
		
		if (hasPlots) {
			out += "\\pgfplotsset{compat=1.18}\n";
		}
		
		if (libraries.size > 0) {
			out += `\\usetikzlibrary{${Array.from(libraries).join(', ')}}\n`;
		}
		out += "\n\\begin{document}\n\n";
	} else {
		out += `% Required packages:\n`;
		packages.forEach(p => out += `\\usepackage{${p}}\n`);
		if (hasPlots) {
			out += "\\pgfplotsset{compat=1.18}\n";
		}
		if (libraries.size > 0) {
			out += `\\usetikzlibrary{${Array.from(libraries).join(', ')}}\n`;
		}
		out += `\n`;
	}

	if (useFigure) {
		out += "\\begin{figure}[htbp]\n	\\centering\n";
	}

	const usedColors = new Map();
	app.shapes.forEach(s => {
		if (s.style.stroke && s.style.stroke !== '#000000' && s.style.stroke !== '#ffffff') {
			usedColors.set(s.style.stroke.toUpperCase(), true);
		}
		if (s.style.fill && s.style.fillType !== 'none') {
			usedColors.set(s.style.fill.toUpperCase(), true);
		}
		if (s.style.fill2 && (s.style.fillType === 'linear' || s.style.fillType === 'radial')) {
			usedColors.set(s.style.fill2.toUpperCase(), true);
		}
	});

	let colorDefs = "";
	let cIdx = 1;
	const colorMap = new Map();
	
	const standardColors = ['#FF0000', '#00FF00', '#0000FF', '#000000', '#FFFFFF', '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080'];
	const standardNames = {'#FF0000':'red', '#00FF00':'green', '#0000FF':'blue', '#000000':'black', '#FFFFFF':'white', '#FFFF00':'yellow', '#00FFFF':'cyan', '#FF00FF':'magenta', '#C0C0C0':'lightgray', '#808080':'gray'};

	usedColors.forEach((_, hex) => {
		if (standardColors.includes(hex)) {
			colorMap.set(hex, standardNames[hex]);
			colorMap.set(hex.toLowerCase(), standardNames[hex]);
		} else {
			const name = `mycolor${cIdx++}`;
			colorMap.set(hex, name);
			colorMap.set(hex.toLowerCase(), name);
			colorDefs += `\\definecolor{${name}}{HTML}{${hex.substring(1)}}\n`;
		}
	});
	
	app.colors = colorMap;

	if (colorDefs) out += colorDefs + "\n";

	const tikzGlobalOpts = [];
	if (style.globalLineWidth && style.globalLineWidth !== 'thin') {
		tikzGlobalOpts.push(style.globalLineWidth);
	}
	
	if (style.globalArrow) {
		const head = style.globalArrow.charAt(0).toUpperCase() + style.globalArrow.slice(1);
		let headStr = head === 'Triangle 45' ? 'Triangle[angle=45:1pt]' : (head === 'To' ? 'To' : head);
		tikzGlobalOpts.push(`>={${headStr}}`);
	}

	if (style.figScale && style.figScale !== 1) {
		tikzGlobalOpts.push(`scale=${style.figScale}`);
		if (style.figScale !== 1) tikzGlobalOpts.push(`transform shape`);
	}

	out += "\\begin{tikzpicture}[";
	if (tikzGlobalOpts.length > 0) out += tikzGlobalOpts.join(', ');
	out += "]\n";

	if (style.exportGrid && app.shapes.length > 0) {
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		app.shapes.forEach(s => {
			const box = ShapeManager[s.type].getBoundingBox(s);
			minX = Math.min(minX, box.minX);
			minY = Math.min(minY, box.minY);
			maxX = Math.max(maxX, box.maxX);
			maxY = Math.max(maxY, box.maxY);
		});
		
		const margin = 1;
		const gx1 = Math.floor(toTikZ(minX) - margin);
		const gy1 = Math.floor(toTikZ(minY, true) - margin); 
		const gx2 = Math.ceil(toTikZ(maxX) + margin);
		const gy2 = Math.ceil(toTikZ(maxY, true) + margin);
		
		const yBottom = Math.min(gy1, gy2);
		const yTop = Math.max(gy1, gy2);
		
		out += `	\\draw[help lines, step=1cm, lightgray!50] (${gx1},${yBottom}) grid (${gx2},${yTop});\n`;
	}

	app.shapes.forEach(s => {
		const shapeDef = ShapeManager[s.type];
		if (!shapeDef || !shapeDef.toTikZ) return;

		let optStr = buildTikzOptions(s);
		
		if (shapeDef.isStandaloneCommand) {
			out += `	${shapeDef.toTikZ(s, optStr)}\n`;
		} else if (s.type === 'text') {
			out += `	\\node${optStr} at ${shapeDef.toTikZ(s)}\n`;
		} else if (s.type === 'line' || s.type === 'rect' || s.type === 'circle' || s.type === 'ellipse') {
			out += `	\\draw${optStr} ${shapeDef.toTikZ(s)}\n`;
		} else {
			out += `	\\draw${optStr} ${shapeDef.toTikZ(s)}\n`;
		}
	});

	out += "\\end{tikzpicture}";

	if (useFigure) {
		if (style.figCaption) out += `\n	\\caption{${style.figCaption}}`;
		if (style.figLabel) out += `\n	\\label{${style.figLabel}}`;
		out += "\n\\end{figure}";
	}

	if (usePreamble) {
		out += "\n\n\\end{document}";
	}
	
	output.innerHTML = out;
	if (window.Prism) Prism.highlightElement(output);
}