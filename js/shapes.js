import { UI_CONSTANTS } from './config.js';
import { toTikZ, distToSegment, rotatePoint, simplifyPoints, tikzToPx, getPerpendicularDistance } from './utils.js';
import { canvas, ctx } from './ui.js';
import { app } from './state.js';
import { buildTikzOptions } from './latexGenerator.js';
import { drawArrow, render, getFillStyle } from './renderer.js';

const latexCache = new Map();

// Fonctions par défaut pour les formes
export const getBoundingBoxFromCoords = (s) => ({
	minX: Math.min(s.x1, s.x2),
	minY: Math.min(s.y1, s.y2),
	maxX: Math.max(s.x1, s.x2),
	maxY: Math.max(s.y1, s.y2),
});

export const defaultHitTest = (s, x, y) => {
	const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
	const tolerance = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
	let testX = x;
	let testY = y;

	if (s.style.rotate) {
		const center = getShapeCenter(s);
		const rad = -s.style.rotate * Math.PI / 180;
		const rotated = rotatePoint(x, y, center.x, center.y, rad);
		testX = rotated.x;
		testY = rotated.y;
	}
	
	const box = getBoundingBoxFromCoords(s);
	if (testX < box.minX - tolerance || testX > box.maxX + tolerance || 
		testY < box.minY - tolerance || testY > box.maxY + tolerance) {
		return false;
	}

	const hasFill = s.style.fillType && s.style.fillType !== 'none';

	if (s.type === 'line') {
		return distToSegment(testX, testY, s.x1, s.y1, s.x2, s.y2) < tolerance;
	}

	if (s.type === 'rect') {
		if (hasFill) {
			return testX >= Math.min(s.x1, s.x2) && testX <= Math.max(s.x1, s.x2) &&
					 testY >= Math.min(s.y1, s.y2) && testY <= Math.max(s.y1, s.y2);
		} else {
			const xMin = Math.min(s.x1, s.x2), xMax = Math.max(s.x1, s.x2);
			const yMin = Math.min(s.y1, s.y2), yMax = Math.max(s.y1, s.y2);
			return (Math.abs(testX - xMin) < tolerance && testY >= yMin - tolerance && testY <= yMax + tolerance) ||
					 (Math.abs(testX - xMax) < tolerance && testY >= yMin - tolerance && testY <= yMax + tolerance) ||
					 (Math.abs(testY - yMin) < tolerance && testX >= xMin - tolerance && testX <= xMax + tolerance) ||
					 (Math.abs(testY - yMax) < tolerance && testX >= xMin - tolerance && testX <= xMax + tolerance);
		}
	}

	if (s.type === 'circle') {
		const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
		const d = Math.sqrt(Math.pow(testX - s.x1, 2) + Math.pow(testY - s.y1, 2));
		if (hasFill) return d <= r;
		return Math.abs(d - r) < tolerance || d < tolerance;
	}

	if (s.type === 'ellipse') {
		const cx = s.x1;
		const cy = s.y1;
		const rx = Math.abs(s.x2 - s.x1);
		const ry = Math.abs(s.y2 - s.y1);
		
		if (rx === 0 || ry === 0) return false;
		
		const normDist = Math.pow((testX - cx) / rx, 2) + Math.pow((testY - cy) / ry, 2);
		const distToCenter = Math.sqrt(Math.pow(testX - cx, 2) + Math.pow(testY - cy, 2));

		if (hasFill) return normDist <= 1;
		return (Math.abs(Math.sqrt(normDist) - 1) * Math.min(rx, ry) < tolerance) || distToCenter < tolerance;
	}

	if (s.type === 'triangle') {
		const p1 = {x: s.x1, y: s.y1};
		const p2 = {x: s.x2, y: s.y2};
		const p3 = {x: s.x3, y: s.y3};

		if (hasFill) {
			const denominator = ((p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y));
			const a = ((p2.y - p3.y) * (testX - p3.x) + (p3.x - p2.x) * (testY - p3.y)) / denominator;
			const b = ((p3.y - p1.y) * (testX - p3.x) + (p1.x - p3.x) * (testY - p3.y)) / denominator;
			const c = 1 - a - b;
			return a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1;
		} else {
			return distToSegment(testX, testY, p1.x, p1.y, p2.x, p2.y) < tolerance ||
					 distToSegment(testX, testY, p2.x, p2.y, p3.x, p3.y) < tolerance ||
					 distToSegment(testX, testY, p3.x, p3.y, p1.x, p1.y) < tolerance;
		}
	}
	
	return true;
};

export const defaultMove = (s, dx, dy) => {
	s.x1 += dx; s.y1 += dy;
	s.x2 += dx; s.y2 += dy;
};

export const defaultResize = (s, mx, my, handle, maintainRatio = false, fromCenter = false) => {
	let x1 = s.x1, y1 = s.y1, x2 = s.x2, y2 = s.y2;
	let newX = mx, newY = my;

	if (maintainRatio) {
		const w = Math.abs(x2 - x1);
		const h = Math.abs(y2 - y1);
		const ratio = w / h || 1;
		
		let refX = (handle.includes('l')) ? x2 : x1;
		let refY = (handle.includes('t')) ? y2 : y1;
		
		if (fromCenter) {
			refX = (x1 + x2) / 2;
			refY = (y1 + y2) / 2;
		}

		const dx = Math.abs(newX - refX);
		const dy = Math.abs(newY - refY);

		if (dx / ratio > dy) {
			const signY = (newY < refY) ? -1 : 1;
			newY = refY + (dx / ratio) * signY;
		} else {
			const signX = (newX < refX) ? -1 : 1;
			newX = refX + (dy * ratio) * signX;
		}
	}

	if (fromCenter) {
		const cx = (x1 + x2) / 2;
		const cy = (y1 + y2) / 2;
		const dx = newX - cx;
		const dy = newY - cy;
		
		if (handle.includes('l')) { s.x1 = cx + dx; s.x2 = cx - dx; }
		if (handle.includes('r')) { s.x2 = cx + dx; s.x1 = cx - dx; }
		if (handle.includes('t')) { s.y1 = cy + dy; s.y2 = cy - dy; }
		if (handle.includes('b')) { s.y2 = cy + dy; s.y1 = cy - dy; }
	} else {
		if (handle.includes('l')) s.x1 = newX;
		if (handle.includes('r')) s.x2 = newX;
		if (handle.includes('t')) s.y1 = newY;
		if (handle.includes('b')) s.y2 = newY;
	}
};

export const defaultGetHandles = (s) => {
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

export const ShapeDefaults = {
	getBoundingBox: getBoundingBoxFromCoords,
	hitTest: defaultHitTest,
	move: defaultMove,
	resize: defaultResize,
	getHandles: defaultGetHandles,
	onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; }
};

export const createShapeDef = (type, overrides) => {
	return {
		type,
		...ShapeDefaults,
		...overrides,
		onDown: (x, y, style) => ({ type, x1: x, y1: y, x2: x, y2: y, style: { ...style }, ...overrides.extraProps }),
	};
};

export function renderShapeLabel(s, ctx, cx, cy) {
	if (!s.style.text) return;

	const style = s.style;
	const rawText = style.text;
	const color = style.stroke || '#000000';
	
	const sizeMap = {
		'tiny': 12, 'scriptsize': 14, 'footnotesize': 16, 'small': 18,
		'normalsize': 20, 'large': 24, 'Large': 28, 'LARGE': 32, 'huge': 36, 'Huge': 42
	};
	const fontSize = sizeMap[style.textSize] || 20;

	const hasMath = rawText.includes('$');

	if (hasMath) {
		const parts = rawText.split(/(\$[^$]+\$)/g);
		let latexContent = '';
		
		parts.forEach(part => {
			if (part.startsWith('$') && part.endsWith('$')) {
				latexContent += part.slice(1, -1);
			} else if (part.length > 0) {
				const escapedPart = part.replace(/[{}]/g, '\\$&');
				latexContent += `\\text{${escapedPart}}`;
			}
		});

		const cacheKey = `${latexContent}::${color}::${fontSize}`;
		let img = latexCache.get(cacheKey);

		if (!img && typeof MathJax !== 'undefined' && MathJax.tex2svg) {
			try {
				const svg = MathJax.tex2svg(latexContent, {
					display: false,
					em: 16,
					ex: 8,
					containerWidth: 80 * 16
				}).querySelector('svg');

				svg.style.color = color;
				svg.style.fill = color;
				svg.setAttribute('fill', color);
				
				const svgString = new XMLSerializer().serializeToString(svg);
				const encodedSvg = encodeURIComponent(svgString).replace(/'/g, "%27").replace(/"/g, "%22");
				
				img = new Image();
				img.src = `data:image/svg+xml,${encodedSvg}`;
				
				const exHeightStr = svg.getAttribute('height') || "1ex";
				const exWidthStr = svg.getAttribute('width') || "1ex";
				const exHeight = parseFloat(exHeightStr.replace('ex', '')) || 1;
				const exWidth = parseFloat(exWidthStr.replace('ex', '')) || 1;
				
				img.dataset.widthEx = exWidth;
				img.dataset.heightEx = exHeight;
				
				latexCache.set(cacheKey, img);
				
				img.onload = () => {
					render();
				};
			} catch (e) {
				console.error(e);
			}
		}

		if (img && img.complete && img.naturalWidth > 0) {
			ctx.save();
			ctx.translate(cx, cy);
			
			if (style.textRotate) {
				ctx.rotate(style.textRotate * Math.PI / 180);
			}
			
			ctx.globalAlpha = style.opacity;

			const scaleFactor = fontSize / 16;
			const displayHeight = (parseFloat(img.dataset.heightEx) * 8) * scaleFactor;
			const displayWidth = (parseFloat(img.dataset.widthEx) * 8) * scaleFactor;

			let offsetX = -displayWidth / 2;
			let offsetY = -displayHeight / 2;

			const anchor = style.textAnchor || 'center';
			
			if (anchor.includes('east')) offsetX = -displayWidth;
			else if (anchor.includes('west')) offsetX = 0;

			if (anchor.includes('north')) offsetY = 0;
			else if (anchor.includes('south')) offsetY = -displayHeight;

			ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight);
			ctx.restore();
		}
	} else {
		const fontMap = {
			'serif': 'serif',
			'sans': 'sans-serif',
			'mono': 'monospace'
		};
		const fontFamily = fontMap[style.textFont] || 'sans-serif';
		const weight = style.textWeight === 'bfseries' ? 'bold ' : '';
		const slant = style.textSlant === 'itshape' ? 'italic ' : '';

		ctx.font = `${slant}${weight}${fontSize}px ${fontFamily}`;
		ctx.fillStyle = color;
		ctx.globalAlpha = style.opacity;

		const anchor = style.textAnchor || 'center';
		let textAlign = 'center';
		let textBaseline = 'middle';

		if (anchor.includes('east')) textAlign = 'right';
		else if (anchor.includes('west')) textAlign = 'left';

		if (anchor.includes('north')) textBaseline = 'top';
		else if (anchor.includes('south')) textBaseline = 'bottom';

		ctx.save();
		ctx.translate(cx, cy);

		if (style.textRotate) {
			ctx.rotate(style.textRotate * Math.PI / 180);
		}

		ctx.textAlign = textAlign;
		ctx.textBaseline = textBaseline;

		const lines = rawText.split('\\\\');
		const lineHeight = fontSize * 1.2;
		let offsetY = 0;

		if (textBaseline === 'middle') {
			offsetY = -((lines.length - 1) * lineHeight) / 2;
		} else if (textBaseline === 'bottom') {
			offsetY = -((lines.length - 1) * lineHeight);
		}

		lines.forEach((line, i) => {
			ctx.fillText(line.trim(), 0, offsetY + (i * lineHeight));
		});

		ctx.restore();
	}
}

export function getTikZLabelNode(s) {
	if (!s.style.text) return '';
	
	const text = s.style.text;
	const fontFamilies = { 'serif': '\\rmfamily', 'sans': '\\sffamily', 'mono': '\\ttfamily' };
	const fontCmd = fontFamilies[s.style.textFont] || '';
	const weightCmd = s.style.textWeight === 'bfseries' ? '\\bfseries' : '';
	const slantCmd = s.style.textSlant === 'itshape' ? '\\itshape' : '';
	const sizeCmd = s.style.textSize && s.style.textSize !== 'normalsize' ? `\\${s.style.textSize}` : '';
	
	let fontContent = [];
	if(fontCmd) fontContent.push(fontCmd);
	if(weightCmd) fontContent.push(weightCmd);
	if(slantCmd) fontContent.push(slantCmd);
	if(sizeCmd) fontContent.push(sizeCmd);
	
	const fontStr = fontContent.length > 0 ? `, font=${fontContent.join(' ')}` : '';
	const anchor = s.style.textAnchor && s.style.textAnchor !== 'center' ? `, anchor=${s.style.textAnchor}` : '';
	const align = s.style.textAlign && s.style.textAlign !== 'center' && s.style.textAlign !== 'none' ? `, align=${s.style.textAlign}` : '';
	const textWidth = s.style.textWidth > 0 ? `, text width=${s.style.textWidth}cm` : '';
	
	if (['line', 'curve', 'arc', 'wave', 'axes'].includes(s.type)) {
		return ` node[pos=0.5${anchor}${align}${textWidth}${fontStr}] {${text}}`;
	} else {
		const center = getShapeCenter(s);
		return ` \\node[${anchor.substring(2) || 'anchor=center'}${align}${textWidth}${fontStr}] at (${toTikZ(center.x, false, s.id, 'cx')},${toTikZ(center.y, true, s.id, 'cy')}) {${text}};`;
	}
}

function evaluateMath(expression, x) {
	try {
		let safeExpression = expression.toLowerCase()
			.replace(/\s+/g, '')
			.replace(/sin/g, 'Math.sin')
			.replace(/cos/g, 'Math.cos')
			.replace(/tan/g, 'Math.tan')
			.replace(/asin/g, 'Math.asin')
			.replace(/acos/g, 'Math.acos')
			.replace(/atan/g, 'Math.atan')
			.replace(/abs/g, 'Math.abs')
			.replace(/sqrt/g, 'Math.sqrt')
			.replace(/exp/g, 'Math.exp')
			.replace(/ln/g, 'Math.log')
			.replace(/log/g, 'Math.log10')
			.replace(/pi/g, 'Math.PI')
			.replace(/e/g, 'Math.E')
			.replace(/\^/g, '**');

		safeExpression = safeExpression.replace(/(\d+)(x)/g, '$1*$2')
			.replace(/\)(x)/g, ')*$1')
			.replace(/(x)\(/g, '$1*(');

		return new Function('x', `return ${safeExpression}`)(x);
	} catch (e) {
		return 0;
	}
}

// La fonction principale qui calcule le centre
export function getShapeCenter(s) {
	if (s.type === 'polygon' || s.type === 'star') {
		return { x: s.x1, y: s.y1 };
	}
	const box = ShapeManager[s.type].getBoundingBox(s);
	return {
		x: (box.minX + box.maxX) / 2,
		y: (box.minY + box.maxY) / 2
	};
}

// Renvoie les points d'ancrage magnétiques d'une forme
export function getShapeAnchors(shape) {
	const anchors = [];
	const box = ShapeManager[shape.type].getBoundingBox(shape);
	const cx = (box.minX + box.maxX) / 2;
	const cy = (box.minY + box.maxY) / 2;

	anchors.push({ x: cx, y: cy, type: 'center' });

	if (shape.x1 !== undefined && shape.y1 !== undefined) anchors.push({ x: shape.x1, y: shape.y1, type: 'point' });
	if (shape.x2 !== undefined && shape.y2 !== undefined) anchors.push({ x: shape.x2, y: shape.y2, type: 'point' });
	if (shape.x3 !== undefined) anchors.push({ x: shape.x3, y: shape.y3, type: 'point' });

	if (shape.type === 'rect' || shape.type === 'image') {
		anchors.push({ x: box.minX, y: box.minY, type: 'corner' });
		anchors.push({ x: box.maxX, y: box.minY, type: 'corner' });
		anchors.push({ x: box.maxX, y: box.maxY, type: 'corner' });
		anchors.push({ x: box.minX, y: box.maxY, type: 'corner' });
		anchors.push({ x: cx, y: box.minY, type: 'mid' });
		anchors.push({ x: box.maxX, y: cy, type: 'mid' });
		anchors.push({ x: cx, y: box.maxY, type: 'mid' });
		anchors.push({ x: box.minX, y: cy, type: 'mid' });
	} else if (shape.type === 'circle' || shape.type === 'ellipse') {
		anchors.push({ x: cx, y: box.minY, type: 'quad' });
		anchors.push({ x: box.maxX, y: cy, type: 'quad' });
		anchors.push({ x: cx, y: box.maxY, type: 'quad' });
		anchors.push({ x: box.minX, y: cy, type: 'quad' });
	}

	if (shape.style && shape.style.rotate) {
		const rad = shape.style.rotate * Math.PI / 180;
		const center = { x: cx, y: cy };
		return anchors.map(p => {
			if (p.type === 'center') return p;
			return { ...rotatePoint(p.x, p.y, center.x, center.y, rad), type: p.type };
		});
	}

	return anchors;
}

// Teste si la souris est sur une poignée de redimensionnement
export function getHandleAtPos(shape, x, y) {
	if (!shape) return null;
	
	const rotation = shape.style.rotate || 0;
	const center = getShapeCenter(shape);
	
	let testX = x;
	let testY = y;
	
	if (rotation !== 0) {
		const rad = -rotation * Math.PI / 180;
		const rotated = rotatePoint(x, y, center.x, center.y, rad);
		testX = rotated.x;
		testY = rotated.y;
	}

	const hitR = UI_CONSTANTS.HANDLE_HIT_RADIUS / app.view.scale;
	const handles = ShapeManager[shape.type].getHandles(shape);
	for (const h of handles) {
		if (Math.abs(testX - h.x) <= hitR && Math.abs(testY - h.y) <= hitR) {
			return h;
		}
	}
	
	const box = ShapeManager[shape.type].getBoundingBox(shape);
	const topMiddle = { x: (box.minX + box.maxX) / 2, y: box.minY };
	
	if (Math.abs(testX - topMiddle.x) <= hitR && 
		Math.abs(testY - (topMiddle.y - UI_CONSTANTS.ROTATION_HANDLE_OFFSET / app.view.scale)) <= hitR) {
		return { pos: 'rotate', cursor: 'grabbing' };
	}

	return null;
}

// Renvoie la forme sous la souris
export function getShapeAtPos(x, y) {
	for (let i = app.shapes.length - 1; i >= 0; i--) {
		const s = app.shapes[i];
		if (ShapeManager[s.type].hitTest(s, x, y)) {
			return s;
		}
	}
	return null;
}

// Renvoie les poignées (pour usage interne parfois)
export function getHandles(s) {
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

// L'objet géant contenant toutes les définitions
export const ShapeManager = {
	point: createShapeDef('point', {
		onDown: (x, y, style) => ({
			type: 'point',
			x1: x, y1: y,
			x2: x, y2: y,
			style: {
				...style,
				pointSize: style.pointSize || 3,
				pointType: style.pointType || 'dot',
				textAnchor: style.textAnchor || 'north west'
			}
		}),
		onDrag: (s, x, y) => { s.x1 = x; s.y1 = y; s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const size = (s.style.pointSize || 3);
			const type = s.style.pointType || 'dot';
			
			ctx.beginPath();
			
			if (type === 'dot') {
				ctx.arc(s.x1, s.y1, size, 0, Math.PI * 2);
				ctx.fillStyle = s.style.stroke;
				ctx.fill();
			} else if (type === 'circle') {
				ctx.arc(s.x1, s.y1, size, 0, Math.PI * 2);
				ctx.stroke();
			} else if (type === 'cross') {
				ctx.moveTo(s.x1 - size, s.y1 - size);
				ctx.lineTo(s.x1 + size, s.y1 + size);
				ctx.moveTo(s.x1 + size, s.y1 - size);
				ctx.lineTo(s.x1 - size, s.y1 + size);
				ctx.stroke();
			} else if (type === 'plus') {
				ctx.moveTo(s.x1 - size, s.y1);
				ctx.lineTo(s.x1 + size, s.y1);
				ctx.moveTo(s.x1, s.y1 - size);
				ctx.lineTo(s.x1, s.y1 + size);
				ctx.stroke();
			}

			renderShapeLabel(s, ctx, s.x1, s.y1);
		},
		toTikZ: (s, opts) => {
			const size = s.style.pointSize || 3;
			const type = s.style.pointType || 'dot';
			const x = toTikZ(s.x1, false, s.id, 'x1');
			const y = toTikZ(s.y1, true, s.id, 'y1');
			const label = getTikZLabelNode(s);
			const finalOpts = opts || '';
			
			let cmd = '';
			if (type === 'dot') {
				cmd = `\\fill${finalOpts} (${x},${y}) circle (${size}pt);`;
			} else if (type === 'circle') {
				cmd = `\\draw${finalOpts} (${x},${y}) circle (${size}pt);`;
			} else if (type === 'cross') {
				cmd = `\\draw${finalOpts} (${x}-${size}pt,${y}-${size}pt) -- (${x}+${size}pt,${y}+${size}pt) (${x}-${size}pt,${y}+${size}pt) -- (${x}+${size}pt,${y}-${size}pt);`;
			} else if (type === 'plus') {
				cmd = `\\draw${finalOpts} (${x}-${size}pt,${y}) -- (${x}+${size}pt,${y}) (${x},${y}-${size}pt) -- (${x},${y}+${size}pt);`;
			}

			return `${cmd}${label}`;
		},
		getBoundingBox: (s) => {
			const size = (s.style.pointSize || 3) + 2;
			return { minX: s.x1 - size, minY: s.y1 - size, maxX: s.x1 + size, maxY: s.y1 + size };
		},
		resize: (s, mx, my) => { s.x1 = mx; s.y1 = my; s.x2 = mx; s.y2 = my; },
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'center', cursor: 'move' }],
		hitTest: (s, x, y) => {
			const size = (s.style.pointSize || 3) + UI_CONSTANTS.HIT_TOLERANCE;
			const dist = Math.sqrt(Math.pow(x - s.x1, 2) + Math.pow(y - s.y1, 2));
			return dist <= size;
		},
		isStandaloneCommand: true
	}),
	text: createShapeDef('text', {
		render: (s, ctx) => {
			renderShapeLabel(s, ctx, s.x1, s.y1);
		},
		toTikZ: (s, opts) => {
			const text = s.style.text || '';
			const fontFamilies = { 'serif': '\\rmfamily', 'sans': '\\sffamily', 'mono': '\\ttfamily' };
			const fontCmd = fontFamilies[s.style.textFont] || '';
			const weightCmd = s.style.textWeight === 'bfseries' ? '\\bfseries' : '';
			const slantCmd = s.style.textSlant === 'itshape' ? '\\itshape' : '';
			const sizeCmd = s.style.textSize && s.style.textSize !== 'normalsize' ? `\\${s.style.textSize}` : '';
			
			let fontContent = [];
			if(fontCmd) fontContent.push(fontCmd);
			if(weightCmd) fontContent.push(weightCmd);
			if(slantCmd) fontContent.push(slantCmd);
			if(sizeCmd) fontContent.push(sizeCmd);
			
			const fontStr = fontContent.length > 0 ? `font=${fontContent.join(' ')}` : '';
			
			let finalOpts = opts ? opts.slice(1, -1) : '';
			if (fontStr) {
				finalOpts = finalOpts ? `${finalOpts}, ${fontStr}` : fontStr;
			}

			const optPart = finalOpts ? `[${finalOpts}] ` : '';
			return `\\node ${optPart}at (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) {${text}};`;
		},
		getBoundingBox: (s) => {
			const sizeMap = {
				'tiny': 12, 'scriptsize': 14, 'footnotesize': 16, 'small': 18,
				'normalsize': 20, 'large': 24, 'Large': 28, 'LARGE': 32, 'huge': 36, 'Huge': 42
			};
			const fontSize = sizeMap[s.style.textSize] || 20;
			const padding = 4;
			const rawText = s.style.text || 'Texte';
			const hasMath = rawText.includes('$');

			if (hasMath) {
				const color = s.style.stroke || '#000000';
				const parts = rawText.split(/(\$[^$]+\$)/g);
				let latexContent = '';
				parts.forEach(part => {
					if (part.startsWith('$') && part.endsWith('$')) {
						latexContent += part.slice(1, -1);
					} else if (part.length > 0) {
						const escapedPart = part.replace(/[{}]/g, '\\$&');
						latexContent += `\\text{${escapedPart}}`;
					}
				});

				const cacheKey = `${latexContent}::${color}::${fontSize}`;
				const img = latexCache.get(cacheKey);

				if (img && img.complete && img.naturalWidth > 0) {
					const scaleFactor = fontSize / 16;
					const displayHeight = (parseFloat(img.dataset.heightEx) * 8) * scaleFactor;
					const displayWidth = (parseFloat(img.dataset.widthEx) * 8) * scaleFactor;
					return { 
						minX: s.x1 - displayWidth / 2 - padding, 
						minY: s.y1 - displayHeight / 2 - padding, 
						maxX: s.x1 + displayWidth / 2 + padding, 
						maxY: s.y1 + displayHeight / 2 + padding 
					};
				}
				return { 
					minX: s.x1 - 40, minY: s.y1 - 10, 
					maxX: s.x1 + 40, maxY: s.y1 + 10 
				};
			} else {
				const fontMap = { 'serif': 'serif', 'sans': 'sans-serif', 'mono': 'monospace' };
				const fontFamily = fontMap[s.style.textFont] || 'sans-serif';
				const weight = s.style.textWeight === 'bfseries' ? 'bold ' : '';
				const slant = s.style.textSlant === 'itshape' ? 'italic ' : '';
				
				const tempCtx = canvas.getContext('2d');
				tempCtx.font = `${slant}${weight}${fontSize}px ${fontFamily}`;
				
				const lines = rawText.split('\\\\');
				let maxWidth = 0;
				lines.forEach(line => {
					const metrics = tempCtx.measureText(line.trim());
					maxWidth = Math.max(maxWidth, metrics.width);
				});
				
				const lineHeight = fontSize * 1.2;
				const height = lines.length * lineHeight;

				return { 
					minX: s.x1 - maxWidth / 2 - padding, 
					minY: s.y1 - height / 2 - padding, 
					maxX: s.x1 + maxWidth / 2 + padding, 
					maxY: s.y1 + height / 2 + padding 
				};
			}
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
		},
		isStandaloneCommand: true
	}),
	line: createShapeDef('line', {
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x2, s.y2);
			ctx.stroke();
			renderShapeLabel(s, ctx, (s.x1 + s.x2)/2, (s.y1 + s.y2)/2);
		},
		toTikZ: (s) => `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) -- (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
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
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const t = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < t;
		}
	}),
	freehand: createShapeDef('freehand', {
		extraProps: { points: [] },
		onDown: (x, y, style) => ({
			type: 'freehand',
			points: [{ x, y }],
			x1: x, y1: y,
			x2: x, y2: y,
			style: { 
				...style,
				simplifyTolerance: style.simplifyTolerance || 2,
				isClosed: style.isClosed || false,
				freehandMode: style.freehandMode || 'smooth',
				cornerRadius: style.cornerRadius || 5
			}
		}),
		onDrag: (s, x, y) => {
			s.points.push({ x, y });
			s.x1 = Math.min(s.x1, x);
			s.y1 = Math.min(s.y1, y);
			s.x2 = Math.max(s.x2, x);
			s.y2 = Math.max(s.y2, y);
		},
		render: (s, ctx) => {
			if (s.points.length < 2) return;
			
			const mode = s.style.freehandMode || 'smooth';
			
			ctx.beginPath();
			
			if (mode === 'rounded' && s.points.length > 2) {
				const radius = (s.style.cornerRadius || 5) * (window.app ? window.app.view.scale : 1) / 2; 
				ctx.moveTo(s.points[0].x, s.points[0].y);
				for (let i = 1; i < s.points.length - 1; i++) {
					const p0 = s.points[i-1];
					const p1 = s.points[i];
					const p2 = s.points[i+1];
					ctx.arcTo(p1.x, p1.y, p2.x, p2.y, radius);
				}
				ctx.lineTo(s.points[s.points.length - 1].x, s.points[s.points.length - 1].y);
			} else {
				ctx.moveTo(s.points[0].x, s.points[0].y);
				for (let i = 1; i < s.points.length; i++) {
					ctx.lineTo(s.points[i].x, s.points[i].y);
				}
			}

			if (s.style.isClosed) {
				ctx.closePath();
			}

			if (s.style.isClosed && s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = getFillStyle(ctx, s);
				ctx.fill();
			}
			
			ctx.stroke();
			
			const center = getShapeCenter(s);
			renderShapeLabel(s, ctx, center.x, center.y);
		},
		toTikZ: (s, opts) => {
			const simplifyVal = s.style.simplifyTolerance !== undefined ? s.style.simplifyTolerance : 2;
			const simplified = simplifyPoints(s.points, simplifyVal);
			const coords = simplified.map((p, i) => `(${toTikZ(p.x, false, s.id, `points.${i}.x`)},${toTikZ(p.y, true, s.id, `points.${i}.y`)})`).join(' ');
			
			const tension = s.style.tension !== undefined ? s.style.tension : 0.7;
			const isClosed = s.style.isClosed;
			const mode = s.style.freehandMode || 'smooth';
			const radius = s.style.cornerRadius || 5;

			let extraOpts = '';
			let pathSuffix = '';
			
			if (mode === 'smooth') {
				extraOpts = isClosed ? `, smooth cycle, tension=${tension}` : `, smooth, tension=${tension}`;
			} else if (mode === 'rounded') {
				extraOpts = `, rounded corners=${radius}pt`;
				if (isClosed) pathSuffix = ' -- cycle';
			} else {
				extraOpts = ', sharp plot';
				if (isClosed) pathSuffix = ' -- cycle';
			}
			
			let finalOpts = opts || '[]';
			if (finalOpts === '[]' || finalOpts === '') {
				finalOpts = `[${extraOpts.startsWith(',') ? extraOpts.substring(2) : extraOpts}]`;
			} else {
				finalOpts = finalOpts.slice(0, -1) + extraOpts + ']';
			}
			
			return `\\draw${finalOpts} plot coordinates {${coords}}${pathSuffix};${getTikZLabelNode(s)}`;
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const tolerance = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
			
			if (s.style.isClosed && s.style.fillType && s.style.fillType !== 'none') {
				let inside = false;
				for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
					const xi = s.points[i].x, yi = s.points[i].y;
					const xj = s.points[j].x, yj = s.points[j].y;
					const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
					if (intersect) inside = !inside;
				}
				if (inside) return true;
			}

			for (let i = 0; i < s.points.length - 1; i++) {
				if (distToSegment(x, y, s.points[i].x, s.points[i].y, s.points[i+1].x, s.points[i+1].y) < tolerance) {
					return true;
				}
			}
			
			if (s.style.isClosed) {
				if (distToSegment(x, y, s.points[s.points.length-1].x, s.points[s.points.length-1].y, s.points[0].x, s.points[0].y) < tolerance) {
					return true;
				}
			}
			
			return false;
		},
		move: (s, dx, dy) => {
			s.x1 += dx; s.y1 += dy;
			s.x2 += dx; s.y2 += dy;
			for (let i = 0; i < s.points.length; i++) {
				s.points[i].x += dx;
				s.points[i].y += dy;
			}
		},
		resize: (s, mx, my, handle) => {
			const oldBounds = ShapeManager.freehand.getBoundingBox(s);
			const oldW = oldBounds.maxX - oldBounds.minX;
			const oldH = oldBounds.maxY - oldBounds.minY;
			
			if (handle.includes('l')) s.x1 = mx;
			if (handle.includes('r')) s.x2 = mx;
			if (handle.includes('t')) s.y1 = my;
			if (handle.includes('b')) s.y2 = my;
			
			const newW = s.x2 - s.x1;
			const newH = s.y2 - s.y1;
			
			if (oldW > 0 && oldH > 0) {
				for (let i = 0; i < s.points.length; i++) {
					const relX = (s.points[i].x - oldBounds.minX) / oldW;
					const relY = (s.points[i].y - oldBounds.minY) / oldH;
					s.points[i].x = s.x1 + relX * newW;
					s.points[i].y = s.y1 + relY * newH;
				}
			}
		},
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'tl', cursor: 'nwse-resize' },
			{ x: s.x2, y: s.y1, pos: 'tr', cursor: 'nesw-resize' },
			{ x: s.x2, y: s.y2, pos: 'br', cursor: 'nwse-resize' },
			{ x: s.x1, y: s.y2, pos: 'bl', cursor: 'nesw-resize' }
		],
		getBoundingBox: (s) => {
			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			for(const p of s.points) {
				if(p.x < minX) minX = p.x;
				if(p.x > maxX) maxX = p.x;
				if(p.y < minY) minY = p.y;
				if(p.y > maxY) maxY = p.y;
			}
			return { minX, minY, maxX, maxY };
		},
		isStandaloneCommand: true
	}),
	rect: createShapeDef('rect', {
		render: (s, ctx) => {
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
			ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
			renderShapeLabel(s, ctx, (s.x1 + s.x2)/2, (s.y1 + s.y2)/2);
		},
		toTikZ: (s) => `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) rectangle (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')}); ${getTikZLabelNode(s)}`
	}),
	circle: createShapeDef('circle', {
		render: (s, ctx) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			renderShapeLabel(s, ctx, s.x1, s.y1);
		},
		toTikZ: (s) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			return `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) circle (${toTikZ(r, false, s.id, 'radius')}); ${getTikZLabelNode(s)}`;
		},
		getBoundingBox: (s) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			return { minX: s.x1 - r, minY: s.y1 - r, maxX: s.x1 + r, maxY: s.y1 + r };
		},
		resize: (s, mx, my, handle, maintainRatio, fromCenter) => {
			if (handle === 'center') {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				s.x1 += dx; s.y1 += dy;
				s.x2 += dx; s.y2 += dy;
			} else {
				let cx = s.x1, cy = s.y1;
				if (fromCenter) {
					const dx = Math.abs(mx - cx);
					const dy = Math.abs(my - cy);
					const r = Math.sqrt(dx*dx + dy*dy);
					s.x2 = s.x1 + r;
					s.y2 = s.y1;
				} else {
					const dx = mx - s.x1;
					const dy = my - s.y1;
					const r = Math.sqrt(dx*dx + dy*dy);
					s.x2 = s.x1 + r;
					s.y2 = s.y1;
				}
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			renderShapeLabel(s, ctx, s.x1, s.y1);
		},
		toTikZ: (s) => {
			const rx = Math.abs(s.x2 - s.x1);
			const ry = Math.abs(s.y2 - s.y1);
			return `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) ellipse (${toTikZ(rx, false, s.id, 'rx')} and ${toTikZ(ry, false, s.id, 'ry')}); ${getTikZLabelNode(s)}`;
		},
		getBoundingBox: (s) => {
			const rx = Math.abs(s.x2 - s.x1);
			const ry = Math.abs(s.y2 - s.y1);
			return { minX: s.x1 - rx, minY: s.y1 - ry, maxX: s.x1 + rx, maxY: s.y1 + ry };
		},
		resize: (s, mx, my, handle, maintainRatio, fromCenter) => {
			if (handle === 'center') {
				const dx = mx - s.x1;
				const dy = my - s.y1;
				const rx = s.x2 - s.x1;
				const ry = s.y2 - s.y1;
				s.x1 = mx; s.y1 = my;
				s.x2 = s.x1 + rx; s.y2 = s.y1 + ry;
			} else {
				let rx = Math.abs(s.x2 - s.x1);
				let ry = Math.abs(s.y2 - s.y1);
				
				if (handle === 'n' || handle === 's') ry = Math.abs(my - s.y1);
				if (handle === 'w' || handle === 'e') rx = Math.abs(mx - s.x1);

				if (maintainRatio) {
					const oldRx = Math.abs(s.x2 - s.x1);
					const oldRy = Math.abs(s.y2 - s.y1);
					const ratio = oldRx / oldRy;
					if (handle === 'n' || handle === 's') rx = ry * ratio;
					else ry = rx / ratio;
				}

				if (fromCenter) {
					s.x2 = s.x1 + rx;
					s.y2 = s.y1 + ry;
				} else {
					s.x2 = s.x1 + rx;
					s.y2 = s.y1 + ry;
				}
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			const cx = (s.x1 + s.x2 + s.x3) / 3;
			const cy = (s.y1 + s.y2 + s.y3) / 3;
			renderShapeLabel(s, ctx, cx, cy);
		},
		toTikZ: (s) => {
			const p1 = `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')})`;
			const p2 = `(${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})`;
			const p3 = `(${toTikZ(s.x3, false, s.id, 'x3')},${toTikZ(s.y3, true, s.id, 'y3')})`;
			return `${p1} -- ${p2} -- ${p3} -- cycle; ${getTikZLabelNode(s)}`;
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			renderShapeLabel(s, ctx, cx, cy);
		},
		toTikZ: (s) => {
			const cx = (s.x1 + s.x2) / 2;
			const cy = (s.y1 + s.y2) / 2;

			const p1 = `(${toTikZ(cx, false, s.id, 'cx')},${toTikZ(s.y1, true, s.id, 'y1')})`;
			const p2 = `(${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(cy, true, s.id, 'cy')})`;
			const p3 = `(${toTikZ(cx, false, s.id, 'cx')},${toTikZ(s.y2, true, s.id, 'y2')})`;
			const p4 = `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(cy, true, s.id, 'cy')})`;

			return `${p1} -- ${p2} -- ${p3} -- ${p4} -- cycle; ${getTikZLabelNode(s)}`;
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const tolerance = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
			const minX = Math.min(s.x1, s.x2);
			const minY = Math.min(s.y1, s.y2);
			const maxX = Math.max(s.x1, s.x2);
			const maxY = Math.max(s.y1, s.y2);
			const cx = (minX + maxX) / 2;
			const cy = (minY + maxY) / 2;

			if (x < minX - tolerance || x > maxX + tolerance || y < minY - tolerance || y > maxY + tolerance) {
				return false;
			}

			if (s.style.fillType && s.style.fillType !== 'none') {
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			renderShapeLabel(s, ctx, s.x1, s.y1);
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
				coords.push(`(${toTikZ(px, false, s.id, `p${i}x`)},${toTikZ(py, true, s.id, `p${i}y`)})`);
			}
			return `${coords.join(' -- ')} -- cycle; ${getTikZLabelNode(s)}`;
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			renderShapeLabel(s, ctx, s.x1, s.y1);
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
				coords.push(`(${toTikZ(px, false, s.id, `p${i}x`)},${toTikZ(py, true, s.id, `p${i}y`)})`);
			}
			return `${coords.join(' -- ')} -- cycle; ${getTikZLabelNode(s)}`;
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
			return `\\draw${opts} (${toTikZ(x1, false, s.id, 'x1')},${toTikZ(y1, true, s.id, 'y1')}) grid[step=${step}] (${toTikZ(x2, false, s.id, 'x2')},${toTikZ(y2, true, s.id, 'y2')});`;
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
			renderShapeLabel(s, ctx, (s.x1 + s.x2)/2, (s.y1 + s.y2)/2);
		},
		toTikZ: (s, opts) => {
			const finalOpts = opts || '[]';
			return `\\draw${finalOpts} (${toTikZ(s.x1, false, s.id, 'x_origin')},${toTikZ(s.y2, true, s.id, 'y_origin')}) -- (${toTikZ(s.x2, false, s.id, 'x_end')},${toTikZ(s.y2, true, s.id, 'y_origin')}) node[right] {$x$};\n	\\draw${finalOpts} (${toTikZ(s.x1, false, s.id, 'x_origin')},${toTikZ(s.y2, true, s.id, 'y_origin')}) -- (${toTikZ(s.x1, false, s.id, 'x_origin')},${toTikZ(s.y1, true, s.id, 'y_end')}) node[above] {$y$}; ${getTikZLabelNode(s)}`;
		},
		isStandaloneCommand: true,
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const t = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
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
			const midAngle = (s.startAngle + s.endAngle) / 2;
			renderShapeLabel(s, ctx, s.x1 + s.radius * Math.cos(midAngle), s.y1 + s.radius * Math.sin(midAngle));
		},
		toTikZ: (s) => {
			const startDeg = Math.round(s.startAngle * 180 / Math.PI);
			const endDeg = Math.round(s.endAngle * 180 / Math.PI);
			const r = toTikZ(s.radius, false, s.id, 'radius');
			return `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) arc (${startDeg}:${endDeg}:${r})${getTikZLabelNode(s)};`;
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
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const t = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
			
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
			renderShapeLabel(s, ctx, (s.x1+s.x2+s.cp1x+s.cp2x)/4, (s.y1+s.y2+s.cp1y+s.cp2y)/4);
		},
		toTikZ: (s) => `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) .. controls (${toTikZ(s.cp1x, false, s.id, 'cp1x')},${toTikZ(s.cp1y, true, s.id, 'cp1y')}) and (${toTikZ(s.cp2x, false, s.id, 'cp2x')},${toTikZ(s.cp2y, true, s.id, 'cp2y')}) .. (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getBoundingBox: (s) => {
			const { x1: x0, y1: y0, x2: x3, y2: y3, cp1x: x1, cp1y: y1, cp2x: x2, cp2y: y2 } = s;
			let minX = Math.min(x0, x3);
			let maxX = Math.max(x0, x3);
			let minY = Math.min(y0, y3);
			let maxY = Math.max(y0, y3);

			const solve = (a, b, c) => {
				if (Math.abs(a) < 1e-9) return Math.abs(b) < 1e-9 ? [] : [-c / b];
				const d = b * b - 4 * a * c;
				if (d < 0) return [];
				const sqrtD = Math.sqrt(d);
				return [(-b + sqrtD) / (2 * a), (-b - sqrtD) / (2 * a)];
			};

			const checkBounds = (p0, p1, p2, p3, axis) => {
				const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3);
				const b = 6 * (p0 - 2 * p1 + p2);
				const c = 3 * (p1 - p0);
				const roots = solve(a, b, c);
				
				roots.forEach(t => {
					if (t > 0 && t < 1) {
						const val = Math.pow(1 - t, 3) * p0 + 3 * Math.pow(1 - t, 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t * p3;
						if (axis === 'x') {
							minX = Math.min(minX, val);
							maxX = Math.max(maxX, val);
						} else {
							minY = Math.min(minY, val);
							maxY = Math.max(maxY, val);
						}
					}
				});
			};

			checkBounds(x0, x1, x2, x3, 'x');
			checkBounds(y0, y1, y2, y3, 'y');

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
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const tolerance = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
			const tolSq = tolerance * tolerance;

			const isFlat = (x0, y0, x1, y1, x2, y2, x3, y3) => {
				const ux = 3*x1 - 2*x0 - x3, uy = 3*y1 - 2*y0 - y3;
				const vx = 3*x2 - 2*x3 - x0, vy = 3*y2 - 2*y3 - y0;
				const mx = Math.max(ux*ux, vx*vx);
				const my = Math.max(uy*uy, vy*vy);
				return mx + my <= 16 * tolSq; 
			};

			const recursiveCheck = (x0, y0, x1, y1, x2, y2, x3, y3) => {
				const minX = Math.min(x0, x1, x2, x3) - tolerance;
				const maxX = Math.max(x0, x1, x2, x3) + tolerance;
				const minY = Math.min(y0, y1, y2, y3) - tolerance;
				const maxY = Math.max(y0, y1, y2, y3) + tolerance;

				if (x < minX || x > maxX || y < minY || y > maxY) return false;

				if (isFlat(x0, y0, x1, y1, x2, y2, x3, y3)) {
					return distToSegment(x, y, x0, y0, x3, y3) < tolerance;
				}

				const x01 = (x0+x1)/2, y01 = (y0+y1)/2;
				const x12 = (x1+x2)/2, y12 = (y1+y2)/2;
				const x23 = (x2+x3)/2, y23 = (y2+y3)/2;
				const x012 = (x01+x12)/2, y012 = (y01+y12)/2;
				const x123 = (x12+x23)/2, y123 = (y12+y23)/2;
				const x0123 = (x012+x123)/2, y0123 = (y012+y123)/2;

				return recursiveCheck(x0, y0, x01, y01, x012, y012, x0123, y0123) ||
					   recursiveCheck(x0123, y0123, x123, y123, x23, y23, x3, y3);
			};

			return recursiveCheck(s.x1, s.y1, s.cp1x, s.cp1y, s.cp2x, s.cp2y, s.x2, s.y2);
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
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx) * 180 / Math.PI;
			
			const len = toTikZ(dist, false, s.id, 'length');
			const numericLen = dist / UI_CONSTANTS.SCALE;
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
			return `\\draw${opts} [shift={(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')})}, rotate=${angle.toFixed(2)}] plot[domain=0:${len}, samples=${Math.ceil(numericLen * 20)}, variable=\\x] (\\x, ${plotFunc})${getTikZLabelNode(s)};`;
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
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const t = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1) + (s.style.waveAmplitude || 0.5) * UI_CONSTANTS.SCALE;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < t;
		},
		isStandaloneCommand: true
	}),
	plot: createShapeDef('plot', {
		onDown: (x, y, style) => ({ 
			type: 'plot', 
			x1: x, y1: y, 
			x2: x + 200, y2: y + 150,
			style: { 
				...style,
				plotFunction: style.plotFunction || 'sin(x)',
				plotDomainMin: style.plotDomainMin !== undefined ? style.plotDomainMin : -5,
				plotDomainMax: style.plotDomainMax !== undefined ? style.plotDomainMax : 5,
				plotYMin: style.plotYMin || '',
				plotYMax: style.plotYMax || '',
				plotSamples: style.plotSamples || 50,
				plotXLabel: style.plotXLabel || '$x$',
				plotYLabel: style.plotYLabel || '$f(x)$',
				plotGrid: style.plotGrid || 'major',
				plotAxisLines: style.plotAxisLines || 'box',
				plotMark: style.plotMark || 'none',
				plotMarkSize: style.plotMarkSize || 2,
				plotLegend: style.plotLegend || '',
				plotLegendPos: style.plotLegendPos || 'north east',
				strokeColor: style.strokeColor || '#5e6ad2',
				lineWidth: style.lineWidth || 1,
				fillType: style.fillType || 'none',
				fillColor: style.fillColor || '#ffffff',
				textSize: style.textSize || 'normalsize'
			} 
		}),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const xMin = Math.min(s.x1, s.x2);
			const yMin = Math.min(s.y1, s.y2);
			const width = Math.abs(s.x2 - s.x1);
			const height = Math.abs(s.y2 - s.y1);

			ctx.save();
			
			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.fillRect(xMin, yMin, width, height);
			}

			ctx.beginPath();
			ctx.rect(xMin, yMin, width, height);
			ctx.clip();

			const domainMin = parseFloat(s.style.plotDomainMin);
			const domainMax = parseFloat(s.style.plotDomainMax);
			const samples = parseInt(s.style.plotSamples) || 50;
			const funcStr = s.style.plotFunction;

			let yVals = [];
			let points = [];
			const step = (domainMax - domainMin) / samples;

			for (let i = 0; i <= samples; i++) {
				const x = domainMin + i * step;
				const y = evaluateMath(funcStr, x);
				points.push({x, y});
				if (!isNaN(y) && isFinite(y)) yVals.push(y);
			}

			let userYMin = parseFloat(s.style.plotYMin);
			let userYMax = parseFloat(s.style.plotYMax);
			
			let plotMinY = isNaN(userYMin) ? (yVals.length ? Math.min(...yVals) : -5) : userYMin;
			let plotMaxY = isNaN(userYMax) ? (yVals.length ? Math.max(...yVals) : 5) : userYMax;

			if (plotMinY >= plotMaxY) {
				plotMinY -= 1;
				plotMaxY += 1;
			}
			
			const rangeY = plotMaxY - plotMinY;
			const rangeX = domainMax - domainMin;

			const mapX = (v) => xMin + ((v - domainMin) / rangeX) * width;
			const mapY = (v) => yMin + height - ((v - plotMinY) / rangeY) * height;

			if (s.style.plotGrid !== 'none') {
				ctx.strokeStyle = '#e0e0e0';
				ctx.lineWidth = 1;
				ctx.beginPath();
				
				const xGridStepVal = rangeX / 10;
				for (let v = Math.ceil(domainMin/xGridStepVal)*xGridStepVal; v <= domainMax; v += xGridStepVal) {
					const gx = mapX(v);
					if(gx >= xMin && gx <= xMin + width) {
						ctx.moveTo(gx, yMin);
						ctx.lineTo(gx, yMin + height);
					}
				}
				
				const yGridStepVal = rangeY / 10;
				for (let v = Math.ceil(plotMinY/yGridStepVal)*yGridStepVal; v <= plotMaxY; v += yGridStepVal) {
					const gy = mapY(v);
					if(gy >= yMin && gy <= yMin + height) {
						ctx.moveTo(xMin, gy);
						ctx.lineTo(xMin + width, gy);
					}
				}
				ctx.stroke();
			}

			const axisStyle = s.style.plotAxisLines;
			ctx.strokeStyle = '#000000';
			ctx.lineWidth = 1;
			ctx.beginPath();

			if (axisStyle === 'box') {
				ctx.strokeRect(xMin, yMin, width, height);
			} else if (axisStyle === 'left') {
				ctx.moveTo(xMin, yMin); ctx.lineTo(xMin, yMin + height);
				ctx.moveTo(xMin, yMin + height); ctx.lineTo(xMin + width, yMin + height);
				ctx.stroke();
			} else if (axisStyle === 'middle' || axisStyle === 'center') {
				const zeroX = mapX(0);
				const zeroY = mapY(0);
				
				if (zeroX >= xMin && zeroX <= xMin + width) {
					ctx.moveTo(zeroX, yMin); ctx.lineTo(zeroX, yMin + height);
				}
				if (zeroY >= yMin && zeroY <= yMin + height) {
					ctx.moveTo(xMin, zeroY); ctx.lineTo(xMin + width, zeroY);
				}
				ctx.stroke();
			}

			if (points.length > 1) {
				ctx.beginPath();
				ctx.strokeStyle = s.style.stroke || '#5e6ad2';
				ctx.lineWidth = s.style.width || 2;
				
				let first = true;
				points.forEach(p => {
					const px = mapX(p.x);
					const py = mapY(p.y);
					
					if (isNaN(px) || isNaN(py) || !isFinite(px) || !isFinite(py)) {
						first = true;
					} else {
						const isInside = px >= xMin - 1 && px <= xMin + width + 1 && py >= yMin - 1 && py <= yMin + height + 1;
						if (isInside) {
							if (first) {
								ctx.moveTo(px, py);
								first = false;
							} else {
								ctx.lineTo(px, py);
							}
						} else {
							first = true;
						}
					}
				});
				ctx.stroke();
			}

			if (s.style.plotMark && s.style.plotMark !== 'none') {
				const size = (s.style.plotMarkSize || 2) * 2;
				ctx.fillStyle = s.style.stroke || '#5e6ad2';
				points.forEach(p => {
					const px = mapX(p.x);
					const py = mapY(p.y);
					if (px >= xMin && px <= xMin + width && py >= yMin && py <= yMin + height) {
						ctx.beginPath();
						if (s.style.plotMark === 'square') ctx.rect(px-size/2, py-size/2, size, size);
						else if (s.style.plotMark === 'triangle') {
							ctx.moveTo(px, py-size/2);
							ctx.lineTo(px+size/2, py+size/2);
							ctx.lineTo(px-size/2, py+size/2);
						}
						else ctx.arc(px, py, size/2, 0, Math.PI*2);
						ctx.fill();
					}
				});
			}

			ctx.restore();

			const sizeMap = {
				'tiny': 10, 'scriptsize': 11, 'footnotesize': 12, 'small': 13,
				'normalsize': 14, 'large': 16, 'Large': 18, 'LARGE': 20, 'huge': 24, 'Huge': 28
			};
			const fontSize = sizeMap[s.style.textSize] || 14;

			ctx.fillStyle = '#000000';
			ctx.font = `${fontSize}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.fillText(s.style.plotXLabel, xMin + width/2, yMin + height + fontSize + 5);
			
			ctx.save();
			ctx.translate(xMin - fontSize - 5, yMin + height/2);
			ctx.rotate(-Math.PI/2);
			ctx.fillText(s.style.plotYLabel, 0, 0);
			ctx.restore();
		},
		toTikZ: (s, opts) => {
			const w = toTikZ(Math.abs(s.x2 - s.x1), false, s.id, 'width');
			const h = toTikZ(Math.abs(s.y2 - s.y1), false, s.id, 'height');
			const cx = toTikZ((s.x1 + s.x2) / 2, false, s.id, 'cx');
			const cy = toTikZ((s.y1 + s.y2) / 2, true, s.id, 'cy');
			
			const domainMin = s.style.plotDomainMin;
			const domainMax = s.style.plotDomainMax;
			const samples = s.style.plotSamples;
			const func = s.style.plotFunction;
			const color = app.colors.get(s.style.stroke) || s.style.stroke;
			
			let axisOpts = [];
			axisOpts.push(`at={(${cx}cm,${cy}cm)}`);
			axisOpts.push(`anchor=center`);
			axisOpts.push(`width=${w}cm`);
			axisOpts.push(`height=${h}cm`);
			axisOpts.push(`xlabel={${s.style.plotXLabel}}`);
			axisOpts.push(`ylabel={${s.style.plotYLabel}}`);
			axisOpts.push(`domain=${domainMin}:${domainMax}`);
			axisOpts.push(`samples=${samples}`);
			
			if (s.style.textSize && s.style.textSize !== 'normalsize') {
				axisOpts.push(`font=\\${s.style.textSize}`);
			}

			if (s.style.fillType && s.style.fillType !== 'none') {
				const bgColor = app.colors.get(s.style.fillColor) || s.style.fillColor;
				axisOpts.push(`axis background/.style={fill=${bgColor}}`);
			}

			if (s.style.plotAxisLines && s.style.plotAxisLines !== 'box') {
				axisOpts.push(`axis lines=${s.style.plotAxisLines}`);
			}
			if (s.style.plotYMin !== '') axisOpts.push(`ymin=${s.style.plotYMin}`);
			if (s.style.plotYMax !== '') axisOpts.push(`ymax=${s.style.plotYMax}`);
			if (s.style.plotGrid && s.style.plotGrid !== 'none') axisOpts.push(`grid=${s.style.plotGrid}`);
			if (s.style.plotLegendPos) axisOpts.push(`legend pos=${s.style.plotLegendPos}`);

			let plotOpts = [];
			plotOpts.push(`color=${color}`);
			if (s.style.width && s.style.width !== 1) plotOpts.push(`line width=${s.style.width}pt`);
			if (s.style.plotMark && s.style.plotMark !== 'none') {
				plotOpts.push(`mark=${s.style.plotMark}`);
				if (s.style.plotMarkSize) plotOpts.push(`mark size=${s.style.plotMarkSize}pt`);
			} else {
				plotOpts.push(`no marks`);
			}

			let code = `\\begin{axis}[\n    ${axisOpts.join(',\n    ')}\n]\n`;
			code += `    \\addplot[${plotOpts.join(', ')}] {${func}}`;
			if (s.style.plotLegend) {
				code += `;\n    \\addlegendentry{${s.style.plotLegend}}`;
			} else {
				code += `;`;
			}
			code += `\n\\end{axis}`;
			return code;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
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
			const unit = dist / 10;
			ctx.lineTo(unit * 2.5, 0);
			for (let i = 0; i < 5; i++) {
				const x = unit * (2.5 + (i + 0.5) * 1);
				const y = (i % 2 === 0) ? -unit : unit;
				ctx.lineTo(x, y);
			}
			ctx.lineTo(unit * 7.5, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[R] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 5;
		},
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
			const w = 15;
			const gap = 3;
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
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[C] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 5;
		},
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
			const startX = dist * 0.25;
			const endX = dist * 0.75;
			const loopCount = 4;
			const loopWidth = (endX - startX) / loopCount;
			ctx.lineTo(startX, 0);
			for (let i = 0; i < loopCount; i++) {
				ctx.arc(startX + (i + 0.5) * loopWidth, 0, loopWidth / 2, Math.PI, 0, false);
			}
			ctx.moveTo(endX, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[L] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 5;
		},
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
			const size = 10;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - size, 0);
			ctx.moveTo(dist/2 - size, -size);
			ctx.lineTo(dist/2 - size, size);
			ctx.lineTo(dist/2 + size, 0);
			ctx.lineTo(dist/2 - size, -size);
			ctx.moveTo(dist/2 + size, -size);
			ctx.lineTo(dist/2 + size, size);
			ctx.moveTo(dist/2 + size, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[D] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 10;
		},
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
			const r = 15;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - r, 0);
			ctx.moveTo(dist/2 + r, 0);
			ctx.arc(dist/2, 0, r, 0, Math.PI * 2);
			ctx.moveTo(dist/2 - 8, -5); ctx.lineTo(dist/2 - 2, -5);
			ctx.moveTo(dist/2 - 5, -8); ctx.lineTo(dist/2 - 5, -2);
			ctx.moveTo(dist/2 + 2, 5); ctx.lineTo(dist/2 + 8, 5);
			ctx.moveTo(dist/2 + r, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[V] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 15;
		},
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
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[sV] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 5;
		},
		isStandaloneCommand: true
	}),
	battery: createShapeDef('battery', {
		onDown: (x, y, style) => ({ type: 'battery', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
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
			const w1 = 15;
			const w2 = 8;
			const d = 4;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - d*1.5, 0);
			for (let i = -1; i <= 1; i += 2) {
				ctx.moveTo(dist/2 + i*d - d/2, -w1); ctx.lineTo(dist/2 + i*d - d/2, w1);
				ctx.moveTo(dist/2 + i*d + d/2, -w2); ctx.lineTo(dist/2 + i*d + d/2, w2);
			}
			ctx.moveTo(dist/2 + d*1.5, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[battery] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 10;
		},
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
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[lamp] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 5;
		},
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
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[switch] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 5;
		},
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
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => {
			const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI;
			return `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) node[ground, rotate=${angle-270}] {}${getTikZLabelNode(s)};`;
		},
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 5;
		},
		isStandaloneCommand: true
	}),
	ammeter: createShapeDef('ammeter', {
		onDown: (x, y, style) => ({ type: 'ammeter', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			const r = 15;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - r, 0);
			ctx.moveTo(dist/2 + r, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(dist/2, 0, r, 0, Math.PI * 2);
			ctx.stroke();
			ctx.rotate(-angle);
			ctx.font = "bold 14px serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("A", dist/2 * Math.cos(angle), dist/2 * Math.sin(angle));
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[ammeter] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 15;
		},
		isStandaloneCommand: true
	}),
	voltmeter: createShapeDef('voltmeter', {
		onDown: (x, y, style) => ({ type: 'voltmeter', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx*dx + dy*dy);
			const angle = Math.atan2(dy, dx);
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			const r = 15;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - r, 0);
			ctx.moveTo(dist/2 + r, 0);
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(dist/2, 0, r, 0, Math.PI * 2);
			ctx.stroke();
			ctx.rotate(-angle);
			ctx.font = "bold 14px serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("V", dist/2 * Math.cos(angle), dist/2 * Math.sin(angle));
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[voltmeter] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 15;
		},
		isStandaloneCommand: true
	}),
	transistor_npn: createShapeDef('transistor_npn', {
		onDown: (x, y, style) => ({ type: 'transistor_npn', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
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
			const size = 15;
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2, 0);
			ctx.moveTo(dist/2, -size);
			ctx.lineTo(dist/2, size);
			ctx.moveTo(dist/2, -size/2); ctx.lineTo(dist/2 + size, -size * 1.5);
			ctx.moveTo(dist/2, size/2); ctx.lineTo(dist/2 + size, size * 1.5);
			const arrowX = dist/2 + size * 0.7;
			const arrowY = size/2 + size * 0.7 * 1.0;
			ctx.moveTo(arrowX, arrowY);
			ctx.lineTo(arrowX - 5, arrowY);
			ctx.moveTo(arrowX, arrowY);
			ctx.lineTo(arrowX, arrowY - 5);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\node[npn] at (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) {}${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 15;
		},
		isStandaloneCommand: true
	}),
	potentiometer: createShapeDef('potentiometer', {
		onDown: (x, y, style) => ({ type: 'potentiometer', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
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
			const unit = dist / 10;
			const w = 10;
			ctx.moveTo(0, 0); ctx.lineTo(unit * 2.5, 0);
			ctx.strokeRect(unit * 2.5, -w/2, unit * 5, w);
			ctx.moveTo(unit * 7.5, 0); ctx.lineTo(dist, 0);
			ctx.moveTo(dist/2, -w*1.5); ctx.lineTo(dist/2, -w/2);
			ctx.moveTo(dist/2 - 3, -w/2 - 3); ctx.lineTo(dist/2, -w/2); ctx.lineTo(dist/2 + 3, -w/2 - 3);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[pR] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' }, { x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < (UI_CONSTANTS.HIT_TOLERANCE / scale) + 15;
		},
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
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
			renderShapeLabel(s, ctx, cx, cy);
		},
		toTikZ: (s, opts) => {
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			
			let axisOpts = "<->";
			if (opts && opts.length > 2) {
				axisOpts += ", " + opts.substring(1, opts.length - 1);
			}
			
			return `\\draw[${axisOpts}] (${cx}, ${cy - h/2}) -- (${cx}, ${cy + h/2}); \\draw${opts || ''} (${cx}, ${cy}) ellipse (${w/2} and ${h/2}); ${getTikZLabelNode(s)}`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			
			ctx.beginPath();
			ctx.moveTo(cx, s.y1); ctx.lineTo(cx, s.y1 + 10);
			ctx.moveTo(cx - 5, s.y1); ctx.lineTo(cx, s.y1 + 5); ctx.lineTo(cx + 5, s.y1);
			
			ctx.moveTo(cx, s.y2); ctx.lineTo(cx, s.y2 - 10);
			ctx.moveTo(cx - 5, s.y2); ctx.lineTo(cx, s.y2 - 5); ctx.lineTo(cx + 5, s.y2);
			ctx.stroke();
			renderShapeLabel(s, ctx, cx, cy);
		},
		toTikZ: (s, opts) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			
			let axisOpts = ">-<";
			if (opts && opts.length > 2) {
				axisOpts += ", " + opts.substring(1, opts.length - 1);
			}

			return `\\draw[${axisOpts}] (${cx}, ${cy - h/2}) -- (${cx}, ${cy + h/2}); ${getTikZLabelNode(s)}`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
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
			renderShapeLabel(s, ctx, (s.x1+s.x2)/2, (s.y1+s.y2)/2);
		},
		toTikZ: (s, opts) => {
			const x1 = toTikZ(s.x1); const y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2); const y2 = toTikZ(s.y2, true);
			return `\\draw${opts || ''} (${x1}, ${y1}) -- (${x2}, ${y2});\n	\\foreach \\i in {0,0.1,...,1} \\draw${opts || ''} ([shift={(\\i*${x2-x1}, \\i*${y2-y1})}] ${x1}, ${y1}) -- ++(-135:0.15); ${getTikZLabelNode(s)}`;
		},
		onDown: (x, y, style) => ({ type: 'mirror', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		isStandaloneCommand: true
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
			ctx.lineTo(x + w * 0.5, y);
			ctx.arc(x + w * 0.5, y + h * 0.5, h * 0.5, -Math.PI / 2, Math.PI / 2);
			ctx.lineTo(x, y + h);
			ctx.closePath();
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w * 0.4, y + h * 0.5);
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const text = s.style.text ? `, label={center:${s.style.text}}` : '';
			return `\\node[and gate US, draw, logic gate inputs=nn, scale=${scale.toFixed(2)}${text}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
	}),
	logic_nand: createShapeDef('logic_nand', {
		onDown: (x, y, style) => ({ type: 'logic_nand', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			const br = h * 0.1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + w * 0.4, y);
			ctx.arc(x + w * 0.4, y + h * 0.5, h * 0.5, -Math.PI / 2, Math.PI / 2);
			ctx.lineTo(x, y + h);
			ctx.closePath();
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x + w * 0.4 + h * 0.5 + br, y + h * 0.5, br, 0, Math.PI * 2);
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w * 0.4, y + h * 0.5);
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const text = s.style.text ? `, label={center:${s.style.text}}` : '';
			return `\\node[nand gate US, draw, logic gate inputs=nn, scale=${scale.toFixed(2)}${text}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2) + (Math.abs(s.y2 - s.y1) * 0.2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
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
			ctx.quadraticCurveTo(x + w * 0.4, y + h * 0.5, x, y + h);
			ctx.quadraticCurveTo(x + w * 0.5, y + h, x + w, y + h * 0.5);
			ctx.quadraticCurveTo(x + w * 0.5, y, x, y);
			ctx.closePath();
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w * 0.4, y + h * 0.5);
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const text = s.style.text ? `, label={center:${s.style.text}}` : '';
			return `\\node[or gate US, draw, logic gate inputs=nn, scale=${scale.toFixed(2)}${text}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
	}),
	logic_xor: createShapeDef('logic_xor', {
		onDown: (x, y, style) => ({ type: 'logic_xor', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			const offset = w * 0.15;
			ctx.beginPath();
			ctx.moveTo(x + offset, y);
			ctx.quadraticCurveTo(x + offset + w * 0.4, y + h * 0.5, x + offset, y + h);
			ctx.quadraticCurveTo(x + offset + w * 0.5, y + h, x + w, y + h * 0.5);
			ctx.quadraticCurveTo(x + offset + w * 0.5, y, x + offset, y);
			ctx.closePath();
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.quadraticCurveTo(x + w * 0.4, y + h * 0.5, x, y + h);
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w * 0.5, y + h * 0.5);
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const text = s.style.text ? `, label={center:${s.style.text}}` : '';
			return `\\node[xor gate US, draw, logic gate inputs=nn, scale=${scale.toFixed(2)}${text}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
	}),
	logic_nor: createShapeDef('logic_nor', {
		onDown: (x, y, style) => ({ type: 'logic_nor', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			const br = h * 0.1;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.5, x, y + h);
			ctx.quadraticCurveTo(x + w * 0.4, y + h, x + w * 0.9, y + h * 0.5);
			ctx.quadraticCurveTo(x + w * 0.4, y, x, y);
			ctx.closePath();
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x + w * 0.9 + br, y + h * 0.5, br, 0, Math.PI * 2);
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w * 0.4, y + h * 0.5);
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const text = s.style.text ? `, label={center:${s.style.text}}` : '';
			return `\\node[nor gate US, draw, logic gate inputs=nn, scale=${scale.toFixed(2)}${text}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2) + (Math.abs(s.y2 - s.y1) * 0.2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
	}),
	logic_xnor: createShapeDef('logic_xnor', {
		onDown: (x, y, style) => ({ type: 'logic_xnor', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			const offset = w * 0.15;
			const br = h * 0.1;
			ctx.beginPath();
			ctx.moveTo(x + offset, y);
			ctx.quadraticCurveTo(x + offset + w * 0.3, y + h * 0.5, x + offset, y + h);
			ctx.quadraticCurveTo(x + offset + w * 0.4, y + h, x + w * 0.9, y + h * 0.5);
			ctx.quadraticCurveTo(x + offset + w * 0.4, y, x + offset, y);
			ctx.closePath();
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.5, x, y + h);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x + w * 0.9 + br, y + h * 0.5, br, 0, Math.PI * 2);
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w * 0.5, y + h * 0.5);
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const text = s.style.text ? `, label={center:${s.style.text}}` : '';
			return `\\node[xnor gate US, draw, logic gate inputs=nn, scale=${scale.toFixed(2)}${text}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2) + (Math.abs(s.y2 - s.y1) * 0.2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
	}),
	logic_not: createShapeDef('logic_not', {
		onDown: (x, y, style) => ({ type: 'logic_not', x1: x, y1: y, x2: x, y2: y, style: { ...style } }),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			const br = h * 0.15;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y + h);
			ctx.lineTo(x + w - br * 2, y + h * 0.5);
			ctx.closePath();
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x + w - br, y + h * 0.5, br, 0, Math.PI * 2);
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w * 0.3, y + h * 0.5);
		},
		toTikZ: (s) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const scale = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const text = s.style.text ? `, label={center:${s.style.text}}` : '';
			return `\\node[not gate US, draw, scale=${scale.toFixed(2)}${text}] at (${cx}, ${cy}) {};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
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
			const cx = toTikZ((s.x1 + s.x2) / 2, false, s.id, 'cx');
			const cy = toTikZ((s.y1 + s.y2) / 2, true, s.id, 'cy');
			const w = toTikZ(Math.abs(s.x2 - s.x1), false, s.id, 'width');
			const h = toTikZ(Math.abs(s.y2 - s.y1), false, s.id, 'height');
			const text = s.style.text || '';
			return `\\node[draw, rounded corners, minimum width=${w}cm, minimum height=${h}cm] at (${cx}, ${cy}) {${text}};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
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
			const cx = toTikZ((s.x1 + s.x2) / 2, false, s.id, 'cx');
			const cy = toTikZ((s.y1 + s.y2) / 2, true, s.id, 'cy');
			const w = toTikZ(Math.abs(s.x2 - s.x1), false, s.id, 'width');
			const h = toTikZ(Math.abs(s.y2 - s.y1), false, s.id, 'height');
			const text = s.style.text || '';
			return `\\node[draw, rectangle, minimum width=${w}cm, minimum height=${h}cm] at (${cx}, ${cy}) {${text}};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
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
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
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
			const rawW = Math.abs(s.x2 - s.x1);
			const rawH = Math.abs(s.y2 - s.y1);
			const ratio = (rawH !== 0) ? (rawW / rawH).toFixed(2) : 1;

			const cx = toTikZ((s.x1 + s.x2) / 2, false, s.id, 'cx');
			const cy = toTikZ((s.y1 + s.y2) / 2, true, s.id, 'cy');
			const w = toTikZ(rawW, false, s.id, 'width');
			const h = toTikZ(rawH, false, s.id, 'height');
			const text = s.style.text || '';
			return `\\node[draw, diamond, aspect=${ratio}, minimum width=${w}cm, minimum height=${h}cm] at (${cx}, ${cy}) {${text}};`;
		},
		getBoundingBox: (s) => ({
			minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2),
			maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2)
		}),
		isStandaloneCommand: true
	}),
	spring: createShapeDef('spring', {
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const angle = Math.atan2(dy, dx);
			const loops = 10;
			const amp = 10;
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			const seg = dist / (loops + 1);
			ctx.lineTo(seg / 2, 0);
			for (let i = 0; i < loops; i++) {
				const x = seg / 2 + (i * seg);
				ctx.lineTo(x + seg / 4, -amp);
				ctx.lineTo(x + 3 * seg / 4, amp);
				ctx.lineTo(x + seg, 0);
			}
			ctx.lineTo(dist, 0);
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2);
		},
		toTikZ: (s) => `\\draw[decorate, decoration={zigzag, amplitude=10pt, segment length=5pt}] (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) -- (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})${getTikZLabelNode(s)};`,
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }
		],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		isStandaloneCommand: true
	}),
	mass: createShapeDef('mass', {
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fillRect(x, y, w, h);
			ctx.strokeRect(x, y, w, h);
			ctx.beginPath();
			ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
			ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w / 2, y + h / 2);
		},
		toTikZ: (s) => {
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			return `\\node[draw, rectangle, minimum width=${w}cm, minimum height=${h}cm, path picture={\\draw (path picture bounding box.south west) -- (path picture bounding box.north east) (path picture bounding box.south east) -- (path picture bounding box.north west);}] at (${cx}, ${cy}) {${s.style.text || ''}};`;
		},
		isStandaloneCommand: true
	}),
	pulley: createShapeDef('pulley', {
		render: (s, ctx) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			ctx.beginPath();
			ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(s.x1, s.y1, r * 0.2, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1 - r); ctx.lineTo(s.x1, s.y1 - r - 15);
			ctx.stroke();
			renderShapeLabel(s, ctx, s.x1, s.y1);
		},
		toTikZ: (s) => {
			const r = toTikZ(Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2)));
			const cx = toTikZ(s.x1);
			const cy = toTikZ(s.y1, true);
			return `\\draw (${cx}, ${cy}) circle (${r}); \\fill (${cx}, ${cy}) circle (1pt); \\draw (${cx}, ${cy}+${r}) -- (${cx}, ${cy}+${r}+0.5); ${getTikZLabelNode(s)}`;
		},
		isStandaloneCommand: true
	}),
	piston: createShapeDef('piston', {
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			ctx.beginPath();
			ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y);
			ctx.stroke();
			ctx.beginPath();
			ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
			ctx.fillRect(x + 2, y + h * 0.3, w - 4, 10);
			ctx.strokeRect(x + 2, y + h * 0.3, w - 4, 10);
			ctx.moveTo(x + w / 2, y + h * 0.3); ctx.lineTo(x + w / 2, y - 10);
			ctx.stroke();
			renderShapeLabel(s, ctx, x + w / 2, y + h / 2);
		},
		toTikZ: (s) => {
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const x = toTikZ(Math.min(s.x1, s.x2));
			const y = toTikZ(Math.min(s.y1, s.y2), true);
			return `\\draw (${x}, ${y}+${h}) -- (${x}, ${y}) -- (${x}+${w}, ${y}) -- (${x}+${w}, ${y}+${h}); \\draw[fill=gray!30] (${x}+0.1, ${y}+${h}*0.4) rectangle (${x}+${w}-0.1, ${y}+${h}*0.4+0.2); \\draw (${x}+${w}/2, ${y}+${h}*0.4+0.2) -- (${x}+${w}/2, ${y}+${h}+0.5);`;
		},
		isStandaloneCommand: true
	}),
	field_mark: createShapeDef('field_mark', {
		onDown: (x, y, style) => ({
			type: 'field_mark',
			x1: x, y1: y,
			x2: x, y2: y,
			style: { ...style, pointType: style.pointType || 'cross' }
		}),
		render: (s, ctx) => {
			const r = 10;
			ctx.beginPath();
			ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
			ctx.stroke();
			if (s.style.pointType === 'cross') {
				const d = r * 0.7;
				ctx.moveTo(s.x1 - d, s.y1 - d); ctx.lineTo(s.x1 + d, s.y1 + d);
				ctx.moveTo(s.x1 + d, s.y1 - d); ctx.lineTo(s.x1 - d, s.y1 + d);
			} else {
				ctx.beginPath();
				ctx.arc(s.x1, s.y1, 2, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.stroke();
		},
		toTikZ: (s) => {
			const cx = toTikZ(s.x1);
			const cy = toTikZ(s.y1, true);
			const symbol = s.style.pointType === 'cross' ? '\\times' : '\\cdot';
			return `\\node[draw, circle, inner sep=1pt] at (${cx}, ${cy}) {$${symbol}$};`;
		},
		isStandaloneCommand: true,
		getBoundingBox: (s) => ({ minX: s.x1 - 10, minY: s.y1 - 10, maxX: s.x1 + 10, maxY: s.y1 + 10 }),
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'center', cursor: 'move' }]
	}),
	repere_cartesian: createShapeDef('repere_cartesian', {
		onDown: (x, y, style) => ({
			type: 'repere_cartesian',
			x1: x, y1: y,
			x2: x, y2: y,
			style: { 
				...style, 
				depth3d: 50, 
				angle3d: 45,
				axisLenX: 80,
				axisLenY: 50,
				axisLenZ: 80
			}
		}),
		render: (s, ctx) => {
			const ang = (s.style.angle3d || 45) * Math.PI / 180;
			const lx = s.style.axisLenX || 80;
			const ly = s.style.axisLenY || 50;
			const lz = s.style.axisLenZ || 80;

			const dy = -ly * Math.sin(ang);
			const dx = ly * Math.cos(ang);

			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x1 + lx, s.y1);
			ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x1, s.y1 - lz);
			ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x1 - dx, s.y1 - dy);
			ctx.stroke();

			drawArrow(ctx, s.x1 + lx, s.y1, 0, 'stealth', 1, s.style.width);
			drawArrow(ctx, s.x1, s.y1 - lz, -Math.PI / 2, 'stealth', 1, s.style.width);
			drawArrow(ctx, s.x1 - dx, s.y1 - dy, Math.PI - ang, 'stealth', 1, s.style.width);

			const fontSize = 14;
			ctx.font = `${fontSize}px serif`;
			ctx.fillText("x", s.x1 + lx + 5, s.y1 + 5);
			ctx.fillText("z", s.x1 - 5, s.y1 - lz - 5);
			ctx.fillText("y", s.x1 - dx - 10, s.y1 - dy + 10);

			renderShapeLabel(s, ctx, s.x1, s.y1 + 15);
		},
		toTikZ: (s, opts) => {
			const x = toTikZ(s.x1);
			const y = toTikZ(s.y1, true);
			const lx = s.style.axisLenX / UI_CONSTANTS.SCALE;
			const ly = s.style.axisLenY / UI_CONSTANTS.SCALE;
			const lz = s.style.axisLenZ / UI_CONSTANTS.SCALE;
			const ang = s.style.angle3d || 45;
			const cleanOpts = opts ? opts.slice(1, -1) : '';
			return `\\begin{scope}[shift={(${x},${y})}, ${cleanOpts}]
	\\draw[->, >=stealth] (0,0) -- (${lx.toFixed(2)},0) node[right] {$x$};
	\\draw[->, >=stealth] (0,0) -- (0,${lz.toFixed(2)}) node[above] {$z$};
	\\draw[->, >=stealth] (0,0) -- (${ang}:-${ly.toFixed(2)}) node[below left] {$y$};
	\\end{scope}`;
		},
		getBoundingBox: (s) => {
			const ly = s.style.axisLenY || 50;
			const ang = (s.style.angle3d || 45) * Math.PI / 180;
			const dx = ly * Math.cos(ang);
			return {
				minX: s.x1 - dx - 10,
				minY: s.y1 - (s.style.axisLenZ || 80) - 10,
				maxX: s.x1 + (s.style.axisLenX || 80) + 10,
				maxY: s.y1 + 20
			};
		},
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'origin', cursor: 'move' }],
		hitTest: (s, x, y) => {
			const box = ShapeManager.repere_cartesian.getBoundingBox(s);
			return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
		},
		isStandaloneCommand: true
	}),
	cube: createShapeDef('cube', {
		onDown: (x, y, style) => ({
			type: 'cube',
			x1: x, y1: y,
			x2: x + 60, y2: y + 60,
			style: { ...style, depth3d: 30, angle3d: 45 }
		}),
		render: (s, ctx) => {
			const w = s.x2 - s.x1;
			const h = s.y2 - s.y1;
			const d = s.style.depth3d || 30;
			const ang = (s.style.angle3d || 45) * Math.PI / 180;
			const dx = d * Math.cos(ang);
			const dy = -d * Math.sin(ang);

			const f1 = {x: s.x1, y: s.y1};
			const f2 = {x: s.x1 + w, y: s.y1};
			const f3 = {x: s.x1 + w, y: s.y1 + h};
			const f4 = {x: s.x1, y: s.y1 + h};

			const b1 = {x: f1.x + dx, y: f1.y + dy};
			const b2 = {x: f2.x + dx, y: f2.y + dy};
			const b3 = {x: f3.x + dx, y: f3.y + dy};
			const b4 = {x: f4.x + dx, y: f4.y + dy};

			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.beginPath();
				ctx.moveTo(f1.x, f1.y); ctx.lineTo(f2.x, f2.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b1.x, b1.y); ctx.closePath(); ctx.fill();
				ctx.beginPath();
				ctx.moveTo(f2.x, f2.y); ctx.lineTo(f3.x, f3.y); ctx.lineTo(b3.x, b3.y); ctx.lineTo(b2.x, b2.y); ctx.closePath(); ctx.fill();
				ctx.beginPath();
				ctx.moveTo(f1.x, f1.y); ctx.lineTo(f2.x, f2.y); ctx.lineTo(f3.x, f3.y); ctx.lineTo(f4.x, f4.y); ctx.closePath(); ctx.fill();
			}

			ctx.beginPath();
			ctx.setLineDash([5, 5]);
			ctx.moveTo(b4.x, b4.y); ctx.lineTo(b1.x, b1.y);
			ctx.moveTo(b4.x, b4.y); ctx.lineTo(b3.x, b3.y);
			ctx.moveTo(b4.x, b4.y); ctx.lineTo(f4.x, f4.y);
			ctx.stroke();

			ctx.beginPath();
			ctx.setLineDash([]);
			ctx.moveTo(f1.x, f1.y); ctx.lineTo(f2.x, f2.y); ctx.lineTo(f3.x, f3.y); ctx.lineTo(f4.x, f4.y); ctx.closePath();
			ctx.moveTo(f1.x, f1.y); ctx.lineTo(b1.x, b1.y);
			ctx.moveTo(f2.x, f2.y); ctx.lineTo(b2.x, b2.y);
			ctx.moveTo(f3.x, f3.y); ctx.lineTo(b3.x, b3.y);
			ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y);
			ctx.stroke();
			
			renderShapeLabel(s, ctx, s.x1 + w / 2, s.y1 + h / 2);
		},
		toTikZ: (s, opts) => {
			const x = toTikZ(s.x1);
			const y = toTikZ(s.y1, true);
			const w = (s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const h = (s.y2 - s.y1) / UI_CONSTANTS.SCALE;
			const d = s.style.depth3d / UI_CONSTANTS.SCALE;
			const ang = s.style.angle3d || 45;
			const color = app.colors.get(s.style.fillColor) || 'white';
			const drawColor = app.colors.get(s.style.stroke) || 'black';
			const cleanOpts = opts ? opts.slice(1, -1) : '';
			const fillOpts = s.style.fillType !== 'none' ? `fill=${color}, draw=${drawColor}` : `draw=${drawColor}`;

			return `\\begin{scope}[shift={(${x},${y})}, ${cleanOpts}]
	\\draw[${fillOpts}] (0,0) -- (${w.toFixed(2)},0) -- (${w.toFixed(2)},${(-h).toFixed(2)}) -- (0,${(-h).toFixed(2)}) -- cycle;
	\\draw[${fillOpts}] (0,0) -- (${ang}:${d.toFixed(2)}) -- ++(${w.toFixed(2)},0) -- (${w.toFixed(2)},0);
	\\draw[${fillOpts}] (${w.toFixed(2)},0) -- ++(${ang}:${d.toFixed(2)}) -- ++(0,${(-h).toFixed(2)}) -- (${w.toFixed(2)},${(-h).toFixed(2)});
	\\draw[${drawColor}, dashed] (0,${(-h).toFixed(2)}) -- ++(${ang}:${d.toFixed(2)}) coordinate (B4);
	\\draw[${drawColor}, dashed] (B4) -- ++(${w.toFixed(2)},0);
	\\draw[${drawColor}, dashed] (B4) -- ++(0,${h.toFixed(2)});
	\\end{scope}`;
		},
		getBoundingBox: (s) => {
			const d = s.style.depth3d || 30;
			const ang = (s.style.angle3d || 45) * Math.PI / 180;
			const dx = d * Math.cos(ang);
			const dy = Math.abs(d * Math.sin(ang));
			return {
				minX: Math.min(s.x1, s.x1 + dx),
				minY: Math.min(s.y1, s.y1 - dy),
				maxX: Math.max(s.x2, s.x2 + dx),
				maxY: Math.max(s.y2, s.y2 - dy)
			};
		},
		isStandaloneCommand: true
	}),
	cylinder_3d: createShapeDef('cylinder_3d', {
		onDown: (x, y, style) => ({
			type: 'cylinder_3d',
			x1: x, y1: y,
			x2: x + 60, y2: y + 100,
			style: { ...style, depth3d: 15 }
		}),
		render: (s, ctx) => {
			const w = s.x2 - s.x1;
			const h = s.y2 - s.y1;
			const rx = w / 2;
			const ry = s.style.depth3d || 15;
			const cx = s.x1 + rx;

			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.beginPath();
				ctx.ellipse(cx, s.y1, rx, ry, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillRect(s.x1, s.y1, w, h);
				ctx.beginPath();
				ctx.ellipse(cx, s.y2, rx, ry, 0, 0, Math.PI);
				ctx.fill();
			}

			ctx.beginPath();
			ctx.ellipse(cx, s.y1, rx, ry, 0, 0, Math.PI * 2);
			ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x1, s.y2);
			ctx.moveTo(s.x2, s.y1); ctx.lineTo(s.x2, s.y2);
			ctx.stroke();

			ctx.beginPath();
			ctx.ellipse(cx, s.y2, rx, ry, 0, 0, Math.PI);
			ctx.stroke();

			ctx.beginPath();
			ctx.setLineDash([5, 5]);
			ctx.ellipse(cx, s.y2, rx, ry, 0, Math.PI, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
			
			renderShapeLabel(s, ctx, cx, s.y1 + h / 2);
		},
		toTikZ: (s, opts) => {
			const cx = toTikZ(s.x1 + (s.x2 - s.x1) / 2);
			const y1 = toTikZ(s.y1, true);
			const h = (s.y2 - s.y1) / UI_CONSTANTS.SCALE;
			const rx = ((s.x2 - s.x1) / 2) / UI_CONSTANTS.SCALE;
			const ry = (s.style.depth3d || 15) / UI_CONSTANTS.SCALE;
			const color = app.colors.get(s.style.fillColor) || 'white';
			const drawColor = app.colors.get(s.style.stroke) || 'black';
			const cleanOpts = opts ? opts.slice(1, -1) : '';

			return `\\begin{scope}[shift={(${cx},${y1})}, ${cleanOpts}]
	\\fill[${color}] (0,0) ellipse (${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\fill[${color}] (${(-rx).toFixed(2)}, 0) rectangle (${rx.toFixed(2)}, ${(-h).toFixed(2)});
	\\fill[${color}] (0,${(-h).toFixed(2)}) ellipse (${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\draw[${drawColor}] (0,0) ellipse (${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\draw[${drawColor}] (${(-rx).toFixed(2)},0) -- (${(-rx).toFixed(2)},${(-h).toFixed(2)});
	\\draw[${drawColor}] (${rx.toFixed(2)},0) -- (${rx.toFixed(2)},${(-h).toFixed(2)});
	\\draw[${drawColor}] (${rx.toFixed(2)},${(-h).toFixed(2)}) arc (0:-180:${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\draw[${drawColor}, dashed] (${rx.toFixed(2)},${(-h).toFixed(2)}) arc (0:180:${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\end{scope}`;
		},
		isStandaloneCommand: true
	}),
	sphere_3d: createShapeDef('sphere_3d', {
		onDown: (x, y, style) => ({
			type: 'sphere_3d',
			x1: x, y1: y,
			x2: x + 60, y2: y + 60,
			style: { ...style, angle3d: 20 }
		}),
		render: (s, ctx) => {
			const r = Math.abs(s.x2 - s.x1) / 2;
			const cx = s.x1 + r;
			const cy = s.y1 + r;
			const ry = s.style.angle3d || 20;

			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2);
				ctx.fill();
			}

			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.stroke();

			ctx.beginPath();
			ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
			ctx.stroke();

			ctx.beginPath();
			ctx.setLineDash([5, 5]);
			ctx.ellipse(cx, cy, r, ry, 0, Math.PI, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.beginPath();
			ctx.ellipse(cx, cy, ry, r, 0, -Math.PI / 2, Math.PI / 2);
			ctx.stroke();
			
			renderShapeLabel(s, ctx, cx, cy);
		},
		toTikZ: (s, opts) => {
			const cx = toTikZ(s.x1 + (s.x2 - s.x1) / 2);
			const cy = toTikZ(s.y1 + (s.x2 - s.x1) / 2, true);
			const r = ((s.x2 - s.x1) / 2) / UI_CONSTANTS.SCALE;
			const ry = (s.style.angle3d || 20) / UI_CONSTANTS.SCALE;
			const color = app.colors.get(s.style.fillColor) || 'white';
			const drawColor = app.colors.get(s.style.stroke) || 'black';
			const cleanOpts = opts ? opts.slice(1, -1) : '';

			return `\\begin{scope}[shift={(${cx},${cy})}, ${cleanOpts}]
	\\draw[${drawColor}, fill=${color}] (0,0) circle (${r.toFixed(2)});
	\\draw[${drawColor}] (${(-r).toFixed(2)},0) arc (180:360:${r.toFixed(2)} and ${ry.toFixed(2)});
	\\draw[${drawColor}, dashed] (${(-r).toFixed(2)},0) arc (180:0:${r.toFixed(2)} and ${ry.toFixed(2)});
	\\draw[${drawColor}] (0,${r.toFixed(2)}) arc (90:-90:${ry.toFixed(2)} and ${r.toFixed(2)});
	\\end{scope}`;
		},
		isStandaloneCommand: true
	}),
	pyramid_3d: createShapeDef('pyramid_3d', {
		onDown: (x, y, style) => ({
			type: 'pyramid_3d',
			x1: x, y1: y,
			x2: x + 60, y2: y + 60,
			style: { ...style, depth3d: 30, angle3d: 45 }
		}),
		render: (s, ctx) => {
			const w = s.x2 - s.x1;
			const h = s.y2 - s.y1;
			const d = s.style.depth3d || 30;
			const ang = (s.style.angle3d || 45) * Math.PI / 180;
			const dx = d * Math.cos(ang);
			const dy = -d * Math.sin(ang);

			const b1 = {x: s.x1, y: s.y2};
			const b2 = {x: s.x2, y: s.y2};
			const b3 = {x: s.x2 + dx, y: s.y2 + dy};
			const b4 = {x: s.x1 + dx, y: s.y2 + dy};
			const apex = {x: s.x1 + w/2 + dx/2, y: s.y1};

			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.beginPath();
				ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(apex.x, apex.y); ctx.closePath(); ctx.fill();
				ctx.beginPath();
				ctx.moveTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y); ctx.lineTo(apex.x, apex.y); ctx.closePath(); ctx.fill();
			}

			ctx.beginPath();
			ctx.setLineDash([5, 5]);
			ctx.moveTo(b1.x, b1.y); ctx.lineTo(b4.x, b4.y); ctx.lineTo(b3.x, b3.y);
			ctx.moveTo(b4.x, b4.y); ctx.lineTo(apex.x, apex.y);
			ctx.stroke();

			ctx.beginPath();
			ctx.setLineDash([]);
			ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y);
			ctx.moveTo(b1.x, b1.y); ctx.lineTo(apex.x, apex.y);
			ctx.moveTo(b2.x, b2.y); ctx.lineTo(apex.x, apex.y);
			ctx.moveTo(b3.x, b3.y); ctx.lineTo(apex.x, apex.y);
			ctx.stroke();
			renderShapeLabel(s, ctx, apex.x, b1.y + 15);
		},
		toTikZ: (s, opts) => {
			const x = toTikZ(s.x1);
			const y = toTikZ(s.y2, true);
			const w = (s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const h = (s.y2 - s.y1) / UI_CONSTANTS.SCALE;
			const d = s.style.depth3d / UI_CONSTANTS.SCALE;
			const ang = s.style.angle3d || 45;
			const color = app.colors.get(s.style.fillColor) || 'white';
			const cleanOpts = opts ? opts.slice(1, -1) : '';
			return `\\begin{scope}[shift={(${x},${y})}, ${cleanOpts}]
	\\coordinate (A) at (0,0); \\coordinate (B) at (${w.toFixed(2)},0); \\coordinate (C) at (${ang}:${d.toFixed(2)});
	\\coordinate (D) at ($(B)+(C)$); \\coordinate (E) at ($(A)+(C)$);
	\\coordinate (Apex) at ($(A)!0.5!(D) + (0,${h.toFixed(2)})$);
	\\draw[dashed] (E) -- (A) (E) -- (C) (E) -- (Apex);
	\\draw[fill=${color}, opacity=0.5] (A) -- (B) -- (Apex) -- cycle;
	\\draw[fill=${color}, opacity=0.5] (B) -- (D) -- (Apex) -- cycle;
	\\draw (A) -- (B) -- (D) (B) -- (Apex) (A) -- (Apex) (D) -- (Apex);
	\\end{scope}`;
		},
		getBoundingBox: (s) => {
			const d = s.style.depth3d || 30;
			return { minX: s.x1 - d, minY: s.y1 - 10, maxX: s.x2 + d, maxY: s.y2 + 10 };
		},
		isStandaloneCommand: true
	}),
	cone_3d: createShapeDef('cone_3d', {
		onDown: (x, y, style) => ({
			type: 'cone_3d',
			x1: x, y1: y,
			x2: x + 60, y2: y + 80,
			style: { ...style, depth3d: 15 }
		}),
		render: (s, ctx) => {
			const w = s.x2 - s.x1;
			const h = s.y2 - s.y1;
			const rx = w / 2;
			const ry = s.style.depth3d || 15;
			const cx = s.x1 + rx;
			const apex = {x: cx, y: s.y1};

			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.beginPath();
				ctx.moveTo(s.x1, s.y2); ctx.lineTo(apex.x, apex.y); ctx.lineTo(s.x2, s.y2); ctx.fill();
				ctx.beginPath();
				ctx.ellipse(cx, s.y2, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
			}

			ctx.beginPath();
			ctx.moveTo(s.x1, s.y2); ctx.lineTo(apex.x, apex.y); ctx.lineTo(s.x2, s.y2);
			ctx.ellipse(cx, s.y2, rx, ry, 0, 0, Math.PI);
			ctx.stroke();

			ctx.beginPath();
			ctx.setLineDash([5, 5]);
			ctx.ellipse(cx, s.y2, rx, ry, 0, Math.PI, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
			renderShapeLabel(s, ctx, cx, s.y2 + ry + 10);
		},
		toTikZ: (s, opts) => {
			const cx = toTikZ(s.x1 + (s.x2 - s.x1) / 2);
			const y2 = toTikZ(s.y2, true);
			const h = (s.y2 - s.y1) / UI_CONSTANTS.SCALE;
			const rx = ((s.x2 - s.x1) / 2) / UI_CONSTANTS.SCALE;
			const ry = (s.style.depth3d || 15) / UI_CONSTANTS.SCALE;
			const color = app.colors.get(s.style.fillColor) || 'white';
			const cleanOpts = opts ? opts.slice(1, -1) : '';
			return `\\begin{scope}[shift={(${cx},${y2})}, ${cleanOpts}]
	\\draw[fill=${color}] (${-rx.toFixed(2)},0) -- (0,${h.toFixed(2)}) -- (${rx.toFixed(2)},0);
	\\draw[fill=${color}] (0,0) ellipse (${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\draw (${-rx.toFixed(2)},0) arc (180:360:${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\draw[dashed] (${-rx.toFixed(2)},0) arc (180:0:${rx.toFixed(2)} and ${ry.toFixed(2)});
	\\end{scope}`;
		},
		isStandaloneCommand: true
	}),
	prism_3d: createShapeDef('prism_3d', {
		onDown: (x, y, style) => ({
			type: 'prism_3d',
			x1: x, y1: y,
			x2: x + 60, y2: y + 60,
			style: { ...style, depth3d: 30, angle3d: 45 }
		}),
		render: (s, ctx) => {
			const w = s.x2 - s.x1;
			const h = s.y2 - s.y1;
			const d = s.style.depth3d || 30;
			const ang = (s.style.angle3d || 45) * Math.PI / 180;
			const dx = d * Math.cos(ang);
			const dy = -d * Math.sin(ang);

			const p1 = {x: s.x1, y: s.y2};
			const p2 = {x: s.x1 + w, y: s.y2};
			const p3 = {x: s.x1 + w/2, y: s.y1};
			const p1b = {x: p1.x + dx, y: p1.y + dy};
			const p2b = {x: p2.x + dx, y: p2.y + dy};
			const p3b = {x: p3.x + dx, y: p3.y + dy};

			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath(); ctx.fill();
				ctx.beginPath();
				ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2b.x, p2b.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p3.x, p3.y); ctx.closePath(); ctx.fill();
				ctx.beginPath();
				ctx.moveTo(p3.x, p3.y); ctx.lineTo(p3b.x, p3b.y); ctx.lineTo(p1b.x, p1b.y); ctx.lineTo(p1.x, p1.y); ctx.closePath(); ctx.fill();
			}

			ctx.beginPath();
			ctx.setLineDash([5, 5]);
			ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1b.x, p1b.y);
			ctx.moveTo(p1b.x, p1b.y); ctx.lineTo(p2b.x, p2b.y);
			ctx.moveTo(p1b.x, p1b.y); ctx.lineTo(p3b.x, p3b.y);
			ctx.stroke();

			ctx.beginPath();
			ctx.setLineDash([]);
			ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
			ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2b.x, p2b.y);
			ctx.moveTo(p3.x, p3.y); ctx.lineTo(p3b.x, p3b.y);
			ctx.moveTo(p2b.x, p2b.y); ctx.lineTo(p3b.x, p3b.y);
			ctx.stroke();
			renderShapeLabel(s, ctx, p1.x + w/2, p1.y + h/2);
		},
		toTikZ: (s, opts) => {
			const x = toTikZ(s.x1);
			const y = toTikZ(s.y2, true);
			const w = (s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const h = (s.y2 - s.y1) / UI_CONSTANTS.SCALE;
			const d = s.style.depth3d / UI_CONSTANTS.SCALE;
			const ang = s.style.angle3d || 45;
			const color = app.colors.get(s.style.fillColor) || 'white';
			const drawColor = app.colors.get(s.style.stroke) || 'black';
			const cleanOpts = opts ? opts.slice(1, -1) : '';
			const fillOpts = s.style.fillType !== 'none' ? `fill=${color}` : '';

			return `\\begin{scope}[shift={(${x},${y})}, ${cleanOpts}]
	\\coordinate (A) at (0,0); \\coordinate (B) at (${w.toFixed(2)},0); \\coordinate (C) at (${(w/2).toFixed(2)},${h.toFixed(2)});
	\\coordinate (Ap) at (${ang}:${d.toFixed(2)}); \\coordinate (Bp) at ($(B)+(Ap)$); \\coordinate (Cp) at ($(C)+(Ap)$);
	\\draw[${drawColor}, dashed] (Ap) -- (A) (Ap) -- (Bp) (Ap) -- (Cp);
	\\draw[${drawColor}, ${fillOpts}] (A) -- (B) -- (C) -- cycle;
	\\draw[${drawColor}, ${fillOpts}] (B) -- (Bp) -- (Cp) -- (C) -- cycle;
	\\draw[${drawColor}, ${fillOpts}] (A) -- (C) -- (Cp) -- (Ap) -- cycle;
	\\draw[${drawColor}] (B) -- (Bp) -- (Cp) -- (C) -- cycle;
	\\end{scope}`;
		},
		isStandaloneCommand: true
	}),
	plane_3d: createShapeDef('plane_3d', {
		onDown: (x, y, style) => ({
			type: 'plane_3d',
			x1: x, y1: y,
			x2: x + 100, y2: y + 60,
			style: { ...style, depth3d: 40, angle3d: 30 }
		}),
		render: (s, ctx) => {
			const w = s.x2 - s.x1;
			const d = s.style.depth3d || 40;
			const ang = (s.style.angle3d || 30) * Math.PI / 180;
			const dx = d * Math.cos(ang);
			const dy = -d * Math.sin(ang);

			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x1 + w, s.y1);
			ctx.lineTo(s.x1 + w + dx, s.y1 + dy);
			ctx.lineTo(s.x1 + dx, s.y1 + dy);
			ctx.closePath();
			
			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.fill();
			}
			ctx.stroke();

			const cx = s.x1 + w/2 + dx/2;
			const cy = s.y1 + dy/2;
			renderShapeLabel(s, ctx, cx, cy);
		},
		toTikZ: (s, opts) => {
			const x = toTikZ(s.x1);
			const y = toTikZ(s.y1, true);
			const w = (s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const d = s.style.depth3d / UI_CONSTANTS.SCALE;
			const ang = s.style.angle3d || 30;
			const color = app.colors.get(s.style.fillColor) || 'blue!20';
			const cleanOpts = opts ? opts.slice(1, -1) + ', ' : '';
			return `\\draw[${cleanOpts}fill=${color}, opacity=0.5] (${x},${y}) -- ++(${w.toFixed(2)},0) -- ++(${ang}:${d.toFixed(2)}) -- ++(${-w.toFixed(2)},0) -- cycle;`;
		},
		getHandles: (s) => {
			return [
				{ x: s.x1, y: s.y1, pos: 'tl', cursor: 'move' },
				{ x: s.x2, y: s.y1, pos: 'tr', cursor: 'ew-resize' }
			];
		},
		isStandaloneCommand: true
	}),
	wedge: createShapeDef('wedge', {
		onDown: (x, y, style) => ({
			type: 'wedge',
			x1: x, y1: y,
			x2: x + 100, y2: y,
			style: { ...style, wedgeAngle: 30 }
		}),
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const ang = (s.style.wedgeAngle || 30) * Math.PI / 180;
			const h = w * Math.tan(ang);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			
			ctx.beginPath();
			ctx.moveTo(x, y + h);
			ctx.lineTo(x + w, y + h);
			if (s.x2 > s.x1) {
				ctx.lineTo(x, y);
			} else {
				ctx.lineTo(x + w, y);
			}
			ctx.closePath();
			
			if (s.style.fillType && s.style.fillType !== 'none') ctx.fill();
			ctx.stroke();
			
			renderShapeLabel(s, ctx, x + w / 3, y + 2 * h / 3);
		},
		toTikZ: (s, opts) => {
			const x = toTikZ(Math.min(s.x1, s.x2));
			const w = Math.abs(s.x2 - s.x1) / UI_CONSTANTS.SCALE;
			const ang = s.style.wedgeAngle || 30;
			const h = w * Math.tan(ang * Math.PI / 180);
			const yBase = toTikZ(Math.min(s.y1, s.y2) + h * UI_CONSTANTS.SCALE, true);
			
			const dir = s.x2 > s.x1 ? 180 : 0;
			return `\\draw${opts} (${x}, ${yBase}) -- ++(${w}, 0) -- ++(${dir - 180 + 180}:${w}) -- cycle;`;
		},
		getBoundingBox: (s) => {
			const w = Math.abs(s.x2 - s.x1);
			const ang = (s.style.wedgeAngle || 30) * Math.PI / 180;
			const h = w * Math.tan(ang);
			const y = Math.min(s.y1, s.y2);
			return {
				minX: Math.min(s.x1, s.x2),
				minY: y,
				maxX: Math.max(s.x1, s.x2),
				maxY: y + h
			};
		},
		getHandles: (s) => {
			const w = Math.abs(s.x2 - s.x1);
			const ang = (s.style.wedgeAngle || 30) * Math.PI / 180;
			const h = w * Math.tan(ang);
			const y = Math.min(s.y1, s.y2);
			return [
				{ x: s.x1, y: y + h, pos: 'bl', cursor: 'ew-resize' },
				{ x: s.x2, y: y + h, pos: 'br', cursor: 'ew-resize' }
			];
		},
		resize: (s, mx, my, handle) => {
			if (handle === 'bl') s.x1 = mx;
			if (handle === 'br') s.x2 = mx;
		},
		isStandaloneCommand: true
	}),
	support: createShapeDef('support', {
		onDown: (x, y, style) => ({
			type: 'support',
			x1: x, y1: y,
			x2: x + 100, y2: y + 20,
			style: { ...style, hatchAngle: 45, fillType: 'none' }
		}),
		render: (s, ctx) => {
			const w = Math.abs(s.x2 - s.x1);
			const h = Math.abs(s.y2 - s.y1);
			const x = Math.min(s.x1, s.x2);
			const y = Math.min(s.y1, s.y2);
			
			ctx.save();
			ctx.beginPath();
			ctx.rect(x, y, w, h);
			ctx.clip();
			
			const spacing = 10;
			const ang = (s.style.hatchAngle || 45) * Math.PI / 180;
			
			ctx.beginPath();
			const diag = Math.sqrt(w*w + h*h);
			const cx = x + w/2;
			const cy = y + h/2;
			
			ctx.translate(cx, cy);
			ctx.rotate(ang);
			ctx.translate(-cx, -cy);
			
			for(let i = -diag; i < diag; i += spacing) {
				ctx.moveTo(cx + i, cy - diag);
				ctx.lineTo(cx + i, cy + diag);
			}
			ctx.stroke();
			ctx.restore();
			
			ctx.strokeRect(x, y, w, h);
			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.globalAlpha = 0.3;
				ctx.fillRect(x, y, w, h);
			}
			renderShapeLabel(s, ctx, x + w / 2, y + h / 2);
		},
		toTikZ: (s, opts) => {
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const x = toTikZ(Math.min(s.x1, s.x2));
			const y = toTikZ(Math.min(s.y1, s.y2), true);
			const ang = s.style.hatchAngle || 45;
			
			let patternOpt = `pattern=north east lines, pattern color=${app.colors.get(s.style.stroke) || 'black'}`;
			if (ang === -45 || ang === 135) patternOpt = `pattern=north west lines, pattern color=${app.colors.get(s.style.stroke) || 'black'}`;
			else if (ang === 0 || ang === 180) patternOpt = `pattern=horizontal lines, pattern color=${app.colors.get(s.style.stroke) || 'black'}`;
			else if (ang === 90 || ang === -90) patternOpt = `pattern=vertical lines, pattern color=${app.colors.get(s.style.stroke) || 'black'}`;
			
			const cleanOpts = opts ? opts.slice(1, -1) + ', ' : '';
			return `\\draw[${cleanOpts}${patternOpt}] (${x}, ${y-h}) rectangle (${x+w}, ${y});`;
		},
		isStandaloneCommand: true
	}),
	damper: createShapeDef('damper', {
		onDown: (x, y, style) => ({
			type: 'damper',
			x1: x, y1: y,
			x2: x + 100, y2: y,
			style: { ...style, damperWidth: 10 }
		}),
		onDrag: (s, x, y) => { s.x2 = x; s.y2 = y; },
		render: (s, ctx) => {
			const dx = s.x2 - s.x1;
			const dy = s.y2 - s.y1;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const angle = Math.atan2(dy, dx);
			const w = (s.style.damperWidth || 10) * UI_CONSTANTS.SCALE / 20; 
			const cylLen = dist * 0.4;
			const rodLen = dist * 0.4;
			
			ctx.save();
			ctx.translate(s.x1, s.y1);
			ctx.rotate(angle);
			
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(dist/2 - cylLen/2, 0);
			
			ctx.moveTo(dist/2 - cylLen/2, -w);
			ctx.lineTo(dist/2 + cylLen/2, -w);
			ctx.lineTo(dist/2 + cylLen/2, w);
			ctx.lineTo(dist/2 - cylLen/2, w);
			
			const pistonX = dist/2; 
			ctx.moveTo(pistonX, -w + 2);
			ctx.lineTo(pistonX, w - 2);
			ctx.moveTo(pistonX, 0);
			ctx.lineTo(dist, 0);
			
			ctx.stroke();
			ctx.restore();
			renderShapeLabel(s, ctx, (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2);
		},
		toTikZ: (s, opts) => {
			const w = (s.style.damperWidth || 10) / 20 * 0.4; 
			const len = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2)) / UI_CONSTANTS.SCALE;
			const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI;
			const x1 = toTikZ(s.x1);
			const y1 = toTikZ(s.y1, true);
			const cleanOpts = opts ? opts.slice(1, -1) : '';
			
			return `\\draw[${cleanOpts}, decoration={markings, mark connection node=dmp, mark=at position 0.5 with 
	{
		\\node (dmp) [inner sep=0, outer sep=0, transform shape, minimum width=${w}cm, minimum height=${len*0.6}cm, draw=none] {};
		\\draw ($(dmp.north west)!0.0!(dmp.north east)$) -- ($(dmp.south west)!0.0!(dmp.south east)$) -- ($(dmp.south west)!1.0!(dmp.south east)$) -- ($(dmp.north west)!1.0!(dmp.north east)$);
		\\draw ($(dmp.west)!0.0!(dmp.east)$) -- ($(dmp.west)!0.4!(dmp.east)$) ($(dmp.west)!0.6!(dmp.east)$) -- ($(dmp.west)!1.0!(dmp.east)$);
		\\draw ($(dmp.west)!0.4!(dmp.east) + (0,${w*0.8})$) -- ($(dmp.west)!0.4!(dmp.east) - (0,${w*0.8})$);
	}}, decorate] (${x1}, ${y1}) -- ++(${angle}:${len});`;
		},
		getHandles: (s) => [
			{ x: s.x1, y: s.y1, pos: 'start', cursor: 'move' },
			{ x: s.x2, y: s.y2, pos: 'end', cursor: 'move' }
		],
		resize: (s, mx, my, handle) => {
			if (handle === 'start') { s.x1 = mx; s.y1 = my; }
			else if (handle === 'end') { s.x2 = mx; s.y2 = my; }
		},
		isStandaloneCommand: true
	}),
	pendulum: createShapeDef('pendulum', {
		onDown: (x, y, style) => ({
			type: 'pendulum',
			x1: x, y1: y,
			x2: x, y2: y + 100, 
			style: { ...style, swingAngle: 0, pendulumLength: 100, bobSize: 10 }
		}),
		render: (s, ctx) => {
			const len = s.style.pendulumLength || 100;
			const ang = (s.style.swingAngle || 0) * Math.PI / 180 + Math.PI / 2;
			const bobR = s.style.bobSize || 10;
			
			const endX = s.x1 + len * Math.cos(ang);
			const endY = s.y1 + len * Math.sin(ang);
			
			ctx.beginPath();
			ctx.moveTo(s.x1 - 10, s.y1); ctx.lineTo(s.x1 + 10, s.y1);
			for(let i=-10; i<10; i+=4) {
				ctx.moveTo(s.x1 + i, s.y1); ctx.lineTo(s.x1 + i + 2, s.y1 - 4);
			}
			ctx.stroke();
			
			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(endX, endY);
			ctx.stroke();
			
			ctx.beginPath();
			ctx.arc(endX, endY, bobR, 0, Math.PI * 2);
			if (s.style.fillType && s.style.fillType !== 'none') {
				ctx.fillStyle = s.style.fillColor;
				ctx.fill();
			}
			ctx.stroke();
			renderShapeLabel(s, ctx, endX, endY + bobR + 10);
		},
		toTikZ: (s, opts) => {
			const x = toTikZ(s.x1);
			const y = toTikZ(s.y1, true);
			const len = s.style.pendulumLength / UI_CONSTANTS.SCALE;
			const ang = -(s.style.swingAngle || 0) - 90;
			const bobR = s.style.bobSize / UI_CONSTANTS.SCALE;
			const cleanOpts = opts ? opts.slice(1, -1) : '';
			const fillOpt = s.style.fillType !== 'none' ? `fill=${app.colors.get(s.style.fillColor) || s.style.fillColor}` : 'fill=white';
			
			return `\\draw[${cleanOpts}] (${x}, ${y}) -- ++(${ang}:${len}) coordinate (bob); \\draw[${cleanOpts}, ${fillOpt}] (bob) circle (${bobR}); \\draw (${x}-0.2, ${y}) -- (${x}+0.2, ${y}); \\fill[pattern=north east lines] (${x}-0.2, ${y}) rectangle (${x}+0.2, ${y}+0.1);`;
		},
		getBoundingBox: (s) => {
			const len = s.style.pendulumLength || 100;
			const bobR = s.style.bobSize || 10;
			return {
				minX: s.x1 - len - bobR,
				minY: s.y1 - 10,
				maxX: s.x1 + len + bobR,
				maxY: s.y1 + len + bobR
			};
		},
		getHandles: (s) => [{ x: s.x1, y: s.y1, pos: 'pivot', cursor: 'move' }],
		resize: (s, mx, my, handle) => {
			s.x1 = mx; s.y1 = my;
		},
		isStandaloneCommand: true
	}),
};