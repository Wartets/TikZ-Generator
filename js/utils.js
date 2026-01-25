import { UI_CONSTANTS } from './config.js';
import { app, activeGuides, setActiveGuides } from './state.js';
import { canvas } from './ui.js';
import { ShapeManager } from './shapes.js';
import { getShapeAnchors } from './shapes.js';

export function toTikZ(val, isY = false, shapeId = null, property = null) {
	let res = val / UI_CONSTANTS.SCALE;
	if (isY) res = (canvas.height - val) / UI_CONSTANTS.SCALE;
	const formattedVal = parseFloat(res.toFixed(3));
	
	if (!app.isPreviewMode && shapeId !== null && property !== null) {
		return `<span class="tikz-number" data-shape-id="${shapeId}" data-property="${property}" data-is-y="${isY}">${formattedVal}</span>`;
	}
	
	return formattedVal;
}

export function tikzToPx(val, isY = false) {
	let res = parseFloat(val) * UI_CONSTANTS.SCALE;
	if (isY) {
		return canvas.height - res;
	}
	return res;
}

export function screenToWorld(sx, sy) {
	return {
		x: (sx - app.view.x) / app.view.scale,
		y: (sy - app.view.y) / app.view.scale
	};
}

export function worldToScreen(wx, wy) {
	return {
		x: wx * app.view.scale + app.view.x,
		y: wy * app.view.scale + app.view.y
	};
}

export function rotatePoint(x, y, cx, cy, angle) {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const dx = x - cx;
	const dy = y - cy;
	return {
		x: cx + dx * cos - dy * sin,
		y: cy + dx * sin + dy * cos
	};
}

export function getPerpendicularDistance(p, p1, p2) {
	let dx = p2.x - p1.x;
	let dy = p2.y - p1.y;
	if (dx === 0 && dy === 0) {
		return Math.sqrt(Math.pow(p.x - p1.x, 2) + Math.pow(p.y - p1.y, 2));
	}
	let numerator = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
	let denominator = Math.sqrt(dy * dy + dx * dx);
	return numerator / denominator;
}

export function simplifyPoints(points, epsilon) {
	if (points.length < 3) return points;
	let maxDistance = 0;
	let index = 0;
	for (let i = 1; i < points.length - 1; i++) {
		let distance = getPerpendicularDistance(points[i], points[0], points[points.length - 1]);
		if (distance > maxDistance) {
			maxDistance = distance;
			index = i;
		}
	}
	if (maxDistance > epsilon) {
		let results1 = simplifyPoints(points.slice(0, index + 1), epsilon);
		let results2 = simplifyPoints(points.slice(index), epsilon);
		return results1.slice(0, results1.length - 1).concat(results2);
	} else {
		return [points[0], points[points.length - 1]];
	}
}

export function distToSegment(x, y, x1, y1, x2, y2) {
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

export function snap(val) {
	return Math.round(val / UI_CONSTANTS.GRID_SIZE) * UI_CONSTANTS.GRID_SIZE;
}

export function getPos(e, refPoint = null) {
	const rect = canvas.getBoundingClientRect();
	const rawScreenX = e.clientX - rect.left;
	const rawScreenY = e.clientY - rect.top;
	const worldPos = screenToWorld(rawScreenX, rawScreenY);
	
	let bestX = worldPos.x;
	let bestY = worldPos.y;

	app.snapMarker = null;
	setActiveGuides([]);

	if (e.ctrlKey || e.metaKey) {
		return { x: bestX, y: bestY };
	}

	const snapDist = UI_CONSTANTS.SNAP_DISTANCE / app.view.scale;
	const guideThreshold = UI_CONSTANTS.GUIDE_THRESHOLD / app.view.scale;
	
	const candidatesX = [];
	const candidatesY = [];
	const pointsOfInterest = [];

	app.shapes.forEach(s => {
		if (app.selectedShapes.includes(s)) return;
		const box = ShapeManager[s.type].getBoundingBox(s);
		const cx = (box.minX + box.maxX) / 2;
		const cy = (box.minY + box.maxY) / 2;

		candidatesX.push({ val: box.minX, type: 'edge' });
		candidatesX.push({ val: box.maxX, type: 'edge' });
		candidatesX.push({ val: cx, type: 'center' });

		candidatesY.push({ val: box.minY, type: 'edge' });
		candidatesY.push({ val: box.maxY, type: 'edge' });
		candidatesY.push({ val: cy, type: 'center' });

		const anchors = getShapeAnchors(s);
		anchors.forEach(a => pointsOfInterest.push(a));
	});

	let snappedPoint = null;
	let minPDist = snapDist;

	for (const p of pointsOfInterest) {
		const dist = Math.sqrt(Math.pow(bestX - p.x, 2) + Math.pow(bestY - p.y, 2));
		if (dist < minPDist) {
			minPDist = dist;
			snappedPoint = p;
		}
	}

	if (snappedPoint) {
		bestX = snappedPoint.x;
		bestY = snappedPoint.y;
		app.snapMarker = { x: bestX, y: bestY };
		return { x: bestX, y: bestY };
	}

	if (refPoint && e.shiftKey) {
		const dx = Math.abs(bestX - refPoint.x);
		const dy = Math.abs(bestY - refPoint.y);
		if (dx > dy) bestY = refPoint.y;
		else bestX = refPoint.x;
	}

	candidatesX.sort((a, b) => Math.abs(a.val - bestX) - Math.abs(b.val - bestX));
	candidatesY.sort((a, b) => Math.abs(a.val - bestY) - Math.abs(b.val - bestY));

	let snappedX = false;
	let snappedY = false;

	if (candidatesX.length > 0 && Math.abs(candidatesX[0].val - bestX) < guideThreshold) {
		bestX = candidatesX[0].val;
		snappedX = true;
		activeGuides.push({ type: 'v', x: bestX, y: worldPos.y });
	}

	if (candidatesY.length > 0 && Math.abs(candidatesY[0].val - bestY) < guideThreshold) {
		bestY = candidatesY[0].val;
		snappedY = true;
		activeGuides.push({ type: 'h', y: bestY, x: worldPos.x });
	}

	if (!snappedX) {
		let adaptiveStep = UI_CONSTANTS.GRID_SIZE;
		while (adaptiveStep * app.view.scale < 15) adaptiveStep *= 2;
		while (adaptiveStep * app.view.scale > 80) adaptiveStep /= 2;
		const gridX = Math.round(bestX / adaptiveStep) * adaptiveStep;
		if (Math.abs(bestX - gridX) < UI_CONSTANTS.HIT_TOLERANCE / app.view.scale) {
			bestX = gridX;
		}
	}

	if (!snappedY) {
		let adaptiveStep = UI_CONSTANTS.GRID_SIZE;
		while (adaptiveStep * app.view.scale < 15) adaptiveStep *= 2;
		while (adaptiveStep * app.view.scale > 80) adaptiveStep /= 2;
		const gridY = Math.round(bestY / adaptiveStep) * adaptiveStep;
		if (Math.abs(bestY - gridY) < UI_CONSTANTS.HIT_TOLERANCE / app.view.scale) {
			bestY = gridY;
		}
	}

	return { x: bestX, y: bestY };
}

export function getSelectionBounds(shapes) {
	if (!shapes || shapes.length === 0) return null;
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	shapes.forEach(s => {
		const box = ShapeManager[s.type].getBoundingBox(s);
		minX = Math.min(minX, box.minX);
		minY = Math.min(minY, box.minY);
		maxX = Math.max(maxX, box.maxX);
		maxY = Math.max(maxY, box.maxY);
	});
	return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}