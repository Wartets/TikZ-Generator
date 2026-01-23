import { UI_CONSTANTS } from './config.js';
import { toTikZ, distToSegment, rotatePoint, simplifyPoints, tikzToPx, getPerpendicularDistance } from './utils.js';
import { canvas, ctx } from './ui.js';
import { app } from './state.js';
import { buildTikzOptions } from './latexGenerator.js';
import { drawArrow } from './renderer.js';

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

	if (s.type === 'line') {
		return distToSegment(testX, testY, s.x1, s.y1, s.x2, s.y2) < tolerance;
	}

	if (s.type === 'rect') {
		if (s.style.fill) {
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
		if (s.style.fill) return d <= r;
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

		if (s.style.fill) return normDist <= 1;
		return (Math.abs(Math.sqrt(normDist) - 1) * Math.min(rx, ry) < tolerance) || distToCenter < tolerance;
	}

	if (s.type === 'triangle') {
		const p1 = {x: s.x1, y: s.y1};
		const p2 = {x: s.x2, y: s.y2};
		const p3 = {x: s.x3, y: s.y3};

		if (s.style.fill) {
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
			let currentY = s.y1;

			if (anchor.y === 'middle') currentY -= ((lines.length - 1) * lineHeight) / 2;
			else if (anchor.y === 'bottom') currentY -= (lines.length - 1) * lineHeight;

			lines.forEach(line => {
				ctx.fillText(line.trim(), s.x1, currentY);
				currentY += lineHeight;
			});
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
			return `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) {${innerContent}};`;
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
		toTikZ: (s) => `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) -- (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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

			if (s.style.isClosed && s.style.fill) {
				ctx.fillStyle = s.style.fill;
				ctx.fill();
			}
			
			ctx.stroke();
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
			
			return `\\draw${finalOpts} plot coordinates {${coords}}${pathSuffix};`;
		},
		hitTest: (s, x, y) => {
			const scale = (window.app && window.app.view) ? window.app.view.scale : 1;
			const tolerance = (UI_CONSTANTS.HIT_TOLERANCE / scale) + (s.style.width || 1);
			
			if (s.style.isClosed && s.style.fill) {
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
			if (s.style.fill) ctx.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
			ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
		},
		toTikZ: (s) => `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) rectangle (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`
	}),
	circle: createShapeDef('circle', {
		render: (s, ctx) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			return `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) circle (${toTikZ(r, false, s.id, 'radius')});`;
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
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const rx = Math.abs(s.x2 - s.x1);
			const ry = Math.abs(s.y2 - s.y1);
			return `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) ellipse (${toTikZ(rx, false, s.id, 'rx')} and ${toTikZ(ry, false, s.id, 'ry')});`;
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
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const p1 = `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')})`;
			const p2 = `(${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')})`;
			const p3 = `(${toTikZ(s.x3, false, s.id, 'x3')},${toTikZ(s.y3, true, s.id, 'y3')})`;
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
			const cx = (s.x1 + s.x2) / 2;
			const cy = (s.y1 + s.y2) / 2;

			const p1 = `(${toTikZ(cx, false, s.id, 'cx')},${toTikZ(s.y1, true, s.id, 'y1')})`;
			const p2 = `(${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(cy, true, s.id, 'cy')})`;
			const p3 = `(${toTikZ(cx, false, s.id, 'cx')},${toTikZ(s.y2, true, s.id, 'y2')})`;
			const p4 = `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(cy, true, s.id, 'cy')})`;

			return `${p1} -- ${p2} -- ${p3} -- ${p4} -- cycle;`;
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
				coords.push(`(${toTikZ(px, false, s.id, `p${i}x`)},${toTikZ(py, true, s.id, `p${i}y`)})`);
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
				coords.push(`(${toTikZ(px, false, s.id, `p${i}x`)},${toTikZ(py, true, s.id, `p${i}y`)})`);
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
		},
		toTikZ: (s, opts) => {
			const finalOpts = opts || '[]';
			return `\\draw${finalOpts} (${toTikZ(s.x1, false, s.id, 'x_origin')},${toTikZ(s.y2, true, s.id, 'y_origin')}) -- (${toTikZ(s.x2, false, s.id, 'x_end')},${toTikZ(s.y2, true, s.id, 'y_origin')}) node[right] {$x$};\n	\\draw${finalOpts} (${toTikZ(s.x1, false, s.id, 'x_origin')},${toTikZ(s.y2, true, s.id, 'y_origin')}) -- (${toTikZ(s.x1, false, s.id, 'x_origin')},${toTikZ(s.y1, true, s.id, 'y_end')}) node[above] {$y$};`;
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
		},
		toTikZ: (s) => {
			const startDeg = Math.round(s.startAngle * 180 / Math.PI);
			const endDeg = Math.round(s.endAngle * 180 / Math.PI);
			const r = toTikZ(s.radius, false, s.id, 'radius');
			return `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) arc (${startDeg}:${endDeg}:${r});`;
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
		},
		toTikZ: (s) => `(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) .. controls (${toTikZ(s.cp1x, false, s.id, 'cp1x')},${toTikZ(s.cp1y, true, s.id, 'cp1y')}) and (${toTikZ(s.cp2x, false, s.id, 'cp2x')},${toTikZ(s.cp2y, true, s.id, 'cp2y')}) .. (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
			return `\\draw${opts} [shift={(${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')})}, rotate=${angle.toFixed(2)}] plot[domain=0:${len}, samples=${Math.ceil(numericLen * 20)}, variable=\\x] (\\x, ${plotFunc});`;
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
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[R] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[C] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[L] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[D] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[battery1] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[sV] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[lamp] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		},
		toTikZ: (s) => `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) to[switch] (${toTikZ(s.x2, false, s.id, 'x2')},${toTikZ(s.y2, true, s.id, 'y2')});`,
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
		},
		toTikZ: (s) => {
			const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI;
			return `\\draw (${toTikZ(s.x1, false, s.id, 'x1')},${toTikZ(s.y1, true, s.id, 'y1')}) node[ground, rotate=${angle-270}] {};`;
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
		toTikZ: (s, opts) => {
			const w = toTikZ(Math.abs(s.x2 - s.x1));
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			
			let axisOpts = "<->";
			if (opts && opts.length > 2) {
				axisOpts += ", " + opts.substring(1, opts.length - 1);
			}
			
			return `\\draw[${axisOpts}] (${cx}, ${cy - h/2}) -- (${cx}, ${cy + h/2}); \\draw${opts || ''} (${cx}, ${cy}) ellipse (${w/2} and ${h/2});`;
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
			if (s.style.fill) ctx.fill();
			ctx.stroke();
			
			ctx.beginPath();
			ctx.moveTo(cx, s.y1); ctx.lineTo(cx, s.y1 + 10);
			ctx.moveTo(cx - 5, s.y1); ctx.lineTo(cx, s.y1 + 5); ctx.lineTo(cx + 5, s.y1);
			
			ctx.moveTo(cx, s.y2); ctx.lineTo(cx, s.y2 - 10);
			ctx.moveTo(cx - 5, s.y2); ctx.lineTo(cx, s.y2 - 5); ctx.lineTo(cx + 5, s.y2);
			ctx.stroke();
		},
		toTikZ: (s, opts) => {
			const cx = toTikZ((s.x1 + s.x2) / 2);
			const cy = toTikZ((s.y1 + s.y2) / 2, true);
			const h = toTikZ(Math.abs(s.y2 - s.y1));
			
			let axisOpts = ">-<";
			if (opts && opts.length > 2) {
				axisOpts += ", " + opts.substring(1, opts.length - 1);
			}

			return `\\draw[${axisOpts}] (${cx}, ${cy - h/2}) -- (${cx}, ${cy + h/2});`;
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
		},
		toTikZ: (s, opts) => {
			const x1 = toTikZ(s.x1); const y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2); const y2 = toTikZ(s.y2, true);
			return `\\draw${opts || ''} (${x1}, ${y1}) -- (${x2}, ${y2});\n	\\foreach \\i in {0,0.1,...,1} \\draw${opts || ''} ([shift={(\\i*${x2-x1}, \\i*${y2-y1})}] ${x1}, ${y1}) -- ++(-135:0.15);`;
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
};