import { app, activeGuides } from './state.js';
import { canvas, ctx } from './ui.js';
import { UI_CONSTANTS } from './config.js';
import { ShapeManager, getShapeCenter } from './shapes.js';
import { getSelectionBounds } from './utils.js';

export function drawArrow(ctx, x, y, angle, headType, scale, lineWidth) {
	if (!headType) headType = 'stealth';
	scale = scale || 1;
	
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.scale(scale, scale);
	
	ctx.beginPath();
	ctx.lineWidth = lineWidth;
	ctx.lineJoin = 'miter';
	ctx.lineCap = 'round';
	
	const s = 10; 
	const w = lineWidth;

	if (headType === 'stealth') {
		ctx.moveTo(0, 0);
		ctx.lineTo(-s, -s * 0.4);
		ctx.lineTo(-s * 0.65, 0);
		ctx.lineTo(-s, s * 0.4);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'latex') {
		ctx.moveTo(0, 0);
		ctx.quadraticCurveTo(-s * 0.3, 0, -s, -s * 0.5);
		ctx.lineTo(-s, -s * 0.5);
		ctx.quadraticCurveTo(-s * 0.7, 0, -s * 1.3, 0);
		ctx.quadraticCurveTo(-s * 0.7, 0, -s, s * 0.5);
		ctx.lineTo(-s, s * 0.5);
		ctx.quadraticCurveTo(-s * 0.3, 0, 0, 0);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'triangle 45') {
		ctx.moveTo(0, 0);
		ctx.lineTo(-s, -s * 0.5);
		ctx.lineTo(-s, s * 0.5);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'to') {
		ctx.lineWidth = lineWidth * 0.8;
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(-s * 0.25, 0, -s * 0.75, -s * 0.25, -s * 1.2, -s * 0.5);
		ctx.lineTo(-s * 0.8, 0);
		ctx.lineTo(-s * 1.2, s * 0.5);
		ctx.bezierCurveTo(-s * 0.75, s * 0.25, -s * 0.25, 0, 0, 0);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'circle') {
		ctx.arc(-s/2, 0, s/2, 0, Math.PI * 2);
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	} else if (headType === 'diamond') {
		ctx.moveTo(0, 0);
		ctx.lineTo(-s/2, -s/3);
		ctx.lineTo(-s, 0);
		ctx.lineTo(-s/2, s/3);
		ctx.closePath();
		ctx.fillStyle = ctx.strokeStyle;
		ctx.fill();
	}

	ctx.restore();
}

export function drawSelection(s, ctx) {
	const shapeDef = ShapeManager[s.type];
	if (!shapeDef) return;

	ctx.save();
	
	if (s.style.rotate) {
		const center = getShapeCenter(s);
		ctx.translate(center.x, center.y);
		ctx.rotate(s.style.rotate * Math.PI / 180);
		ctx.translate(-center.x, -center.y);
	}

	const isSingleSelection = app.selectedShapes.length === 1;

	if (s.type !== 'curve' && s.type !== 'arc' && s.type !== 'line' && s.type !== 'triangle') {
		const box = shapeDef.getBoundingBox(s);
		ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
		ctx.lineWidth = 1 / app.view.scale;
		ctx.setLineDash([4 / app.view.scale, 2 / app.view.scale]);
		ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
	}
	
	if (!isSingleSelection) {
		ctx.restore();
		return;
	}

	const hs = UI_CONSTANTS.HANDLE_SIZE / app.view.scale;
	const hs_half = hs / 2;
	
	if (shapeDef.drawHandles) {
		shapeDef.drawHandles(s, ctx);
	}
	
	const handles = shapeDef.getHandles(s);
	handles.forEach(h => {
		if (s.type === 'curve') return; 

		ctx.fillStyle = 'white';
		ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
		ctx.lineWidth = 1 / app.view.scale;
		ctx.setLineDash([]); 
		ctx.beginPath();
		ctx.rect(h.x - hs_half, h.y - hs_half, hs, hs);
		ctx.fill();
		ctx.stroke();
	});

	if (s.type !== 'curve' && s.type !== 'line') {
		const box = shapeDef.getBoundingBox(s);
		const midX = (box.minX + box.maxX) / 2;
		const handleY = box.minY - UI_CONSTANTS.ROTATION_HANDLE_OFFSET / app.view.scale;
		
		ctx.beginPath();
		ctx.moveTo(midX, box.minY);
		ctx.lineTo(midX, handleY);
		ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
		ctx.lineWidth = 1 / app.view.scale;
		ctx.setLineDash([]);
		ctx.stroke();
		
		ctx.beginPath();
		ctx.arc(midX, handleY, 5 / app.view.scale, 0, Math.PI * 2);
		ctx.fillStyle = 'white';
		ctx.fill();
		ctx.stroke();
	}

	ctx.restore();
}

export function renderShape(s, ctx) {
	ctx.save();
	
	if (s.style.rotate) {
		const center = getShapeCenter(s);
		ctx.translate(center.x, center.y);
		ctx.rotate(s.style.rotate * Math.PI / 180);
		ctx.translate(-center.x, -center.y);
	}

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

export function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	ctx.save();
	
	ctx.translate(app.view.x, app.view.y);
	ctx.scale(app.view.scale, app.view.scale);

	const visibleLeft = -app.view.x / app.view.scale;
	const visibleTop = -app.view.y / app.view.scale;
	const visibleRight = visibleLeft + canvas.width / app.view.scale;
	const visibleBottom = visibleTop + canvas.height / app.view.scale;
	
	ctx.save();
	ctx.fillStyle = UI_CONSTANTS.GRID_RENDER_COLOR;
	
	let adaptiveStep = UI_CONSTANTS.GRID_SIZE;
	while (adaptiveStep * app.view.scale < 15) {
		adaptiveStep *= 2;
	}
	while (adaptiveStep * app.view.scale > 80) {
		adaptiveStep /= 2;
	}
	
	const startX = Math.floor(visibleLeft / adaptiveStep) * adaptiveStep;
	const startY = Math.floor(visibleTop / adaptiveStep) * adaptiveStep;
	
	if (app.view.scale > 0.05) {
		ctx.beginPath();
		for (let x = startX; x < visibleRight; x += adaptiveStep) {
			for (let y = startY; y < visibleBottom; y += adaptiveStep) {
				ctx.rect(x - 1, y - 1, 2, 2);
			}
		}
		ctx.fill();
	}
	ctx.restore();

	ctx.save();
	ctx.strokeStyle = UI_CONSTANTS.AXIS_HELPER_COLOR;
	ctx.lineWidth = 2 / app.view.scale;
	ctx.beginPath();
	ctx.moveTo(visibleLeft, 0); ctx.lineTo(visibleRight, 0);
	ctx.moveTo(0, visibleTop); ctx.lineTo(0, visibleBottom);
	ctx.stroke();
	ctx.restore();

	app.shapes.forEach(s => renderShape(s, ctx));
	if (app.currentShape) renderShape(app.currentShape, ctx);
	
	if (app.hoveredShape && !app.selectedShapes.includes(app.hoveredShape)) {
		ctx.save();
		ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
		ctx.lineWidth = 2 / app.view.scale;
		ctx.globalAlpha = 0.5;
		
		if (app.hoveredShape.style.rotate) {
			const center = getShapeCenter(app.hoveredShape);
			ctx.translate(center.x, center.y);
			ctx.rotate(app.hoveredShape.style.rotate * Math.PI / 180);
			ctx.translate(-center.x, -center.y);
		}
		
		const shapeDef = ShapeManager[app.hoveredShape.type];
		if (shapeDef && shapeDef.getBoundingBox) {
			const box = shapeDef.getBoundingBox(app.hoveredShape);
			ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
		}
		
		ctx.restore();
	}

	if (activeGuides.length > 0) {
		ctx.save();
		ctx.lineWidth = 1 / app.view.scale;
		
		activeGuides.forEach(g => {
			ctx.beginPath();
			if (g.type === 'v') {
				ctx.moveTo(g.x, visibleTop);
				ctx.lineTo(g.x, visibleBottom);
			} else {
				ctx.moveTo(visibleLeft, g.y);
				ctx.lineTo(visibleRight, g.y);
			}
			ctx.strokeStyle = '#ff4757';
			ctx.setLineDash([4 / app.view.scale, 4 / app.view.scale]);
			ctx.stroke();
		});
		ctx.restore();
	}

	if (app.selectedShapes.length === 1) {
		drawSelection(app.selectedShapes[0], ctx);
	} else if (app.selectedShapes.length > 1) {
		app.selectedShapes.forEach(s => {
			ctx.save();
			if (s.style.rotate) {
				const center = getShapeCenter(s);
				ctx.translate(center.x, center.y);
				ctx.rotate(s.style.rotate * Math.PI / 180);
				ctx.translate(-center.x, -center.y);
			}
			const box = ShapeManager[s.type].getBoundingBox(s);
			ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
			ctx.lineWidth = 1 / app.view.scale;
			ctx.setLineDash([4 / app.view.scale, 2 / app.view.scale]);
			ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
			ctx.restore();
		});

		const bounds = getSelectionBounds(app.selectedShapes);
		if (bounds) {
			ctx.save();
			ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
			ctx.lineWidth = 1 / app.view.scale;
			ctx.setLineDash([]);
			ctx.strokeRect(bounds.minX, bounds.minY, bounds.w, bounds.h);
			
			const hs = UI_CONSTANTS.HANDLE_SIZE / app.view.scale;
			const hs_half = hs / 2;
			const handles = [
				{ x: bounds.minX, y: bounds.minY }, { x: bounds.cx, y: bounds.minY }, { x: bounds.maxX, y: bounds.minY },
				{ x: bounds.minX, y: bounds.cy }, { x: bounds.maxX, y: bounds.cy },
				{ x: bounds.minX, y: bounds.maxY }, { x: bounds.cx, y: bounds.maxY }, { x: bounds.maxX, y: bounds.maxY }
			];

			handles.forEach(h => {
				ctx.fillStyle = 'white';
				ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
				ctx.fillRect(h.x - hs_half, h.y - hs_half, hs, hs);
				ctx.strokeRect(h.x - hs_half, h.y - hs_half, hs, hs);
			});
			
			const rotY = bounds.minY - UI_CONSTANTS.ROTATION_HANDLE_OFFSET / app.view.scale;
			ctx.beginPath();
			ctx.moveTo(bounds.cx, bounds.minY);
			ctx.lineTo(bounds.cx, rotY);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(bounds.cx, rotY, 5 / app.view.scale, 0, Math.PI * 2);
			ctx.fillStyle = 'white';
			ctx.fill();
			ctx.stroke();
			ctx.restore();
		}
	}

	if (app.selectionBox.active) {
		ctx.save();
		ctx.strokeStyle = UI_CONSTANTS.SELECTION_COLOR;
		ctx.lineWidth = 1 / app.view.scale;
		ctx.fillStyle = 'rgba(94, 106, 210, 0.1)';
		ctx.setLineDash([4 / app.view.scale, 2 / app.view.scale]);
		ctx.fillRect(app.selectionBox.startX, app.selectionBox.startY, app.selectionBox.w, app.selectionBox.h);
		ctx.strokeRect(app.selectionBox.startX, app.selectionBox.startY, app.selectionBox.w, app.selectionBox.h);
		ctx.restore();
	}

	if (app.snapMarker) {
		ctx.save();
		ctx.fillStyle = '#ff4757';
		ctx.beginPath();
		ctx.arc(app.snapMarker.x, app.snapMarker.y, 4 / app.view.scale, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = 'white';
		ctx.lineWidth = 2 / app.view.scale;
		ctx.stroke();
		ctx.restore();
	}

	ctx.restore();
}
