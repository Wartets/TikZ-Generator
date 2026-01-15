import { app, pushState } from './state.js';
import { canvas, ctx, coordsDisplay, setTool } from './ui.js';
import { getPos, rotatePoint, simplifyPoints, screenToWorld } from './utils.js';
import { ShapeManager, getHandleAtPos, getShapeAtPos, getShapeCenter } from './shapes.js';
import { render, renderShape } from './renderer.js';
import { TOOL_CONFIG, UI_CONSTANTS } from './config.js';
import { generateCode } from './latexGenerator.js';
import { updateUIFromShape, updateSettingsVisibility } from './ui.js';
import { getSelectionBounds } from './utils.js';
import { toTikZ } from './utils.js';

export class BaseTool {
	onMouseDown(e) {}
	onMouseMove(e) {}
	onMouseUp(e) {}
	onActivate() {}
	onDeactivate() {}
}

export class DrawingTool extends BaseTool {
	constructor(shapeType) {
		super();
		this.shapeType = shapeType;
		this.startX = 0;
		this.startY = 0;
		this.config = TOOL_CONFIG[shapeType];
		this.mode = 'drawing'; 
		this.editHandle = null;
		this.step = 0;
		this.initialEditShape = null;
	}

	onMouseDown(e) {
		const p = getPos(e);
		
		if (app.selectedShape) {
			const handle = getHandleAtPos(app.selectedShape, p.x, p.y);
			if (handle) {
				this.mode = 'editing';
				this.editHandle = handle.pos;
				this.initialEditShape = JSON.parse(JSON.stringify(app.selectedShape));
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
				if (this.shapeType === 'freehand') {
					app.currentShape.points = [{x: p.x, y: p.y}];
				}
			}
		}
		render();
	}

	onMouseMove(e) {
		const refPoint = (this.mode === 'drawing' && app.currentShape) ? { x: this.startX, y: this.startY } : null;
		const p = getPos(e, refPoint);

		if (this.mode === 'editing' && app.selectedShape && this.initialEditShape) {
			const s = app.selectedShape;
			const init = this.initialEditShape;

			Object.assign(s, JSON.parse(JSON.stringify(init)));

			const initBox = ShapeManager[init.type].getBoundingBox(init);
			const cx = (initBox.minX + initBox.maxX) / 2;
			const cy = (initBox.minY + initBox.maxY) / 2;

			const rotation = init.style.rotate || 0;
			const rad = -rotation * Math.PI / 180;
			const rotatedP = rotatePoint(p.x, p.y, cx, cy, rad);

			ShapeManager[s.type].resize(s, rotatedP.x, rotatedP.y, this.editHandle, e.shiftKey, e.altKey);
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
			this.initialEditShape = null;
			generateCode();
			pushState();
			return;
		}

		if (!app.currentShape) return;
		
		const shapeDef = ShapeManager[this.shapeType];
		
		if (this.shapeType === 'freehand' && app.currentShape.points.length > 2) {
			const tolerance = app.currentShape.style.simplifyTolerance || 2;
			app.currentShape.points = simplifyPoints(app.currentShape.points, tolerance);
		}

		if (shapeDef.onNextStep) {
			const isFinished = shapeDef.onNextStep(app.currentShape, this.step);
			if (!isFinished) {
				this.step++;
				return;
			}
		} else {
			if (this.shapeType !== 'freehand' && Math.abs(this.startX - app.currentShape.x2) < 2 && Math.abs(this.startY - app.currentShape.y2) < 2) {
				app.currentShape = null;
				render();
				return;
			}
		}

		app.currentShape.id = app.nextShapeId++;
		app.shapes.push(app.currentShape);
		
		app.selectedShape = app.currentShape;
		app.selectedShapes = [app.currentShape];
		updateUIFromShape(app.selectedShape);
		updateSettingsVisibility(this.shapeType, app.selectedShape.type);
		
		pushState();
		generateCode();
		
		app.currentShape = null;
		this.step = 0;
		render();
	}

	onActivate() {
		app.selectedShape = null;
		app.selectedShapes = [];
		app.currentShape = null;
		this.step = 0;
		canvas.style.cursor = this.config.cursor || 'crosshair';
		render();
	}
}

export class SelectTool extends BaseTool {
	constructor() {
		super();
		this.mode = 'idle';
		this.handle = null;
		this.dragStart = { x: 0, y: 0 };
		this.initialShapesState = []; 
		this.groupBoundsStart = null;
		this.initialAngle = 0;
		this.config = TOOL_CONFIG['select'];
		this.isDragSelecting = false;
	}

	onMouseDown(e) {
		const p = getPos(e);
		this.dragStart = p;

		if (app.selectedShapes.length === 1) {
			const handle = getHandleAtPos(app.selectedShapes[0], p.x, p.y);
			if (handle) {
				if (handle.pos === 'rotate') {
					this.mode = 'rotating';
					this.initialShapesState = [JSON.parse(JSON.stringify(app.selectedShapes[0]))];
					const center = getShapeCenter(app.selectedShapes[0]);
					this.initialAngle = Math.atan2(p.y - center.y, p.x - center.x);
					const currentRotRad = (app.selectedShapes[0].style.rotate || 0) * Math.PI / 180;
					this.initialAngle -= currentRotRad;
				} else {
					this.mode = 'resizing';
					this.handle = handle.pos;
					this.initialShapesState = [JSON.parse(JSON.stringify(app.selectedShapes[0]))];
					
					const opposites = {
						'tl': 'br', 'tm': 'bm', 'tr': 'bl',
						'mr': 'ml', 'br': 'tl', 'bm': 'tm',
						'bl': 'tr', 'ml': 'mr',
						'n': 's', 's': 'n', 'e': 'w', 'w': 'e',
						'start': 'end', 'end': 'start',
						'p1': 'p2', 'p2': 'p1', 'cp1': 'p2', 'cp2': 'p1',
						'radius': 'center', 'center': 'radius'
					};

					const s = app.selectedShapes[0];
					const oppPos = opposites[this.handle];
					if (oppPos) {
						const handles = ShapeManager[s.type].getHandles(s);
						const oppHandle = handles.find(h => h.pos === oppPos);
						if (oppHandle) {
							const center = getShapeCenter(s);
							const rad = (s.style.rotate || 0) * Math.PI / 180;
							this.fixedAnchor = rotatePoint(oppHandle.x, oppHandle.y, center.x, center.y, rad);
						} else {
							this.fixedAnchor = null;
						}
					} else {
						this.fixedAnchor = getShapeCenter(s);
					}
				}
				render();
				return;
			}
		}

		if (app.selectedShapes.length > 1) {
			const bounds = getSelectionBounds(app.selectedShapes);
			const handle = this.getGroupHandleAtPos(bounds, p.x, p.y);
			if (handle) {
				this.initialShapesState = app.selectedShapes.map(s => JSON.parse(JSON.stringify(s)));
				this.groupBoundsStart = bounds;
				
				if (handle.pos === 'rotate') {
					this.mode = 'rotating-group';
					this.initialAngle = Math.atan2(p.y - bounds.cy, p.x - bounds.cx);
				} else {
					this.mode = 'resizing-group';
					this.handle = handle.pos;
				}
				render();
				return;
			}
		}

		const clickedShape = getShapeAtPos(p.x, p.y);

		if (clickedShape) {
			if (e.ctrlKey || e.shiftKey) {
				if (app.selectedShapes.includes(clickedShape)) {
					const idx = app.selectedShapes.indexOf(clickedShape);
					app.selectedShapes.splice(idx, 1);
					app.selectedShape = app.selectedShapes.length > 0 ? app.selectedShapes[app.selectedShapes.length - 1] : null;
				} else {
					app.selectedShapes.push(clickedShape);
					app.selectedShape = clickedShape;
				}
			} else {
				if (!app.selectedShapes.includes(clickedShape)) {
					app.selectedShapes = [clickedShape];
					app.selectedShape = clickedShape;
				}
			}
			
			updateUIFromShape(app.selectedShape);
			this.mode = 'moving';
			this.initialShapesState = app.selectedShapes.map(s => JSON.parse(JSON.stringify(s)));
			render();
			return;
		}

		if (!clickedShape && !e.shiftKey && !e.ctrlKey) {
			app.selectedShapes = [];
			app.selectedShape = null;
			updateUIFromShape(null);
		}

		this.mode = 'box-selecting';
		this.isDragSelecting = true;
		app.selectionBox = { startX: p.x, startY: p.y, w: 0, h: 0, active: true };
		render();
	}

	onMouseMove(e) {
		const p = getPos(e);
		
		if (this.mode === 'idle') {
			this.handleHover(p);
			return;
		}

		if (this.mode === 'moving') {
			const dx = p.x - this.dragStart.x;
			const dy = p.y - this.dragStart.y;
			
			app.selectedShapes.forEach((s, i) => {
				const init = this.initialShapesState[i];
				const deltaX = dx;
				const deltaY = dy;
				
				s.x1 = init.x1 + deltaX; s.y1 = init.y1 + deltaY;
				s.x2 = init.x2 + deltaX; s.y2 = init.y2 + deltaY;
				
				if (s.x3 !== undefined) { s.x3 = init.x3 + deltaX; s.y3 = init.y3 + deltaY; }
				if (s.cp1x !== undefined) { s.cp1x = init.cp1x + deltaX; s.cp1y = init.cp1y + deltaY; }
				if (s.cp2x !== undefined) { s.cp2x = init.cp2x + deltaX; s.cp2y = init.cp2y + deltaY; }
				
				if (s.type === 'freehand' && s.points && init.points) {
					for(let j=0; j<s.points.length; j++) {
						s.points[j].x = init.points[j].x + deltaX;
						s.points[j].y = init.points[j].y + deltaY;
					}
				}
			});
			render();
			return;
		}

		if (this.mode === 'rotating') {
			const center = getShapeCenter(app.selectedShapes[0]);
			const currentAngle = Math.atan2(p.y - center.y, p.x - center.x);
			let deg = (currentAngle - this.initialAngle) * 180 / Math.PI;
			deg = Math.round(deg); 
			if (e.shiftKey) deg = Math.round(deg / 15) * 15;
			app.selectedShapes[0].style.rotate = (deg + 360) % 360;
			updateUIFromShape(app.selectedShapes[0]);
			render();
			return;
		}

		if (this.mode === 'rotating-group') {
			const bounds = this.groupBoundsStart;
			const currentAngle = Math.atan2(p.y - bounds.cy, p.x - bounds.cx);
			let angleDiff = currentAngle - this.initialAngle;
			if (e.shiftKey) {
				const deg = angleDiff * 180 / Math.PI;
				angleDiff = (Math.round(deg / 15) * 15) * Math.PI / 180;
			}
			
			const cos = Math.cos(angleDiff);
			const sin = Math.sin(angleDiff);

			app.selectedShapes.forEach((s, i) => {
				const init = this.initialShapesState[i];
				const initCenter = getShapeCenter(init);
				
				const dx = initCenter.x - bounds.cx;
				const dy = initCenter.y - bounds.cy;
				
				const nx = bounds.cx + dx * cos - dy * sin;
				const ny = bounds.cy + dx * sin + dy * cos;
				
				const moveX = nx - initCenter.x;
				const moveY = ny - initCenter.y;
				
				ShapeManager[s.type].move(s, moveX, moveY);
				
				const oldRot = init.style.rotate || 0;
				s.style.rotate = (oldRot + (angleDiff * 180 / Math.PI) + 360) % 360;
			});
			render();
			return;
		}

		if (this.mode === 'resizing') {
			const s = app.selectedShapes[0];
			const init = this.initialShapesState[0];
			
			Object.assign(s, JSON.parse(JSON.stringify(init)));

			const initBox = ShapeManager[init.type].getBoundingBox(init);
			const cx = (initBox.minX + initBox.maxX) / 2;
			const cy = (initBox.minY + initBox.maxY) / 2;

			const rotation = init.style.rotate || 0;
			const rad = (rotation * Math.PI / 180);
			const negRad = -rad;
			
			const rotatedP = rotatePoint(p.x, p.y, cx, cy, negRad);

			ShapeManager[s.type].resize(
				s, 
				rotatedP.x, rotatedP.y, 
				this.handle, 
				e.shiftKey, 
				e.altKey
			);

			if (this.fixedAnchor && rotation !== 0) {
				const opposites = {
					'tl': 'br', 'tm': 'bm', 'tr': 'bl',
					'mr': 'ml', 'br': 'tl', 'bm': 'tm',
					'bl': 'tr', 'ml': 'mr',
					'n': 's', 's': 'n', 'e': 'w', 'w': 'e',
					'start': 'end', 'end': 'start',
					'p1': 'p2', 'p2': 'p1', 'cp1': 'p2', 'cp2': 'p1',
					'radius': 'center', 'center': 'radius'
				};
				const oppPos = opposites[this.handle];
				if (oppPos) {
					const handles = ShapeManager[s.type].getHandles(s);
					const newOppHandle = handles.find(h => h.pos === oppPos);
					
					if (newOppHandle) {
						const newCenter = getShapeCenter(s);
						const currentFixedWorld = rotatePoint(newOppHandle.x, newOppHandle.y, newCenter.x, newCenter.y, rad);
						
						const dx = this.fixedAnchor.x - currentFixedWorld.x;
						const dy = this.fixedAnchor.y - currentFixedWorld.y;
						
						ShapeManager[s.type].move(s, dx, dy);
					}
				}
			}
			render();
			return;
		}

		if (this.mode === 'resizing-group') {
			const bounds = this.groupBoundsStart;
			let nx = bounds.minX, ny = bounds.minY, nw = bounds.w, nh = bounds.h;
			const ratio = bounds.w / bounds.h;
			
			if (this.handle.includes('e')) nw = Math.max(1, p.x - bounds.minX);
			if (this.handle.includes('w')) { nw = Math.max(1, bounds.maxX - p.x); nx = p.x; }
			if (this.handle.includes('s')) nh = Math.max(1, p.y - bounds.minY);
			if (this.handle.includes('n')) { nh = Math.max(1, bounds.maxY - p.y); ny = p.y; }

			if (e.shiftKey && !this.handle.includes('m')) {
				if (nw / ratio > nh) {
					nh = nw / ratio;
					if (this.handle.includes('n')) ny = bounds.maxY - nh;
				} else {
					nw = nh * ratio;
					if (this.handle.includes('w')) nx = bounds.maxX - nw;
				}
			}

			const scaleX = nw / bounds.w;
			const scaleY = nh / bounds.h;

			app.selectedShapes.forEach((s, i) => {
				const init = this.initialShapesState[i];
				
				const relX1 = (init.x1 - bounds.minX) / bounds.w;
				const relY1 = (init.y1 - bounds.minY) / bounds.h;
				const relX2 = (init.x2 - bounds.minX) / bounds.w;
				const relY2 = (init.y2 - bounds.minY) / bounds.h;

				s.x1 = nx + relX1 * nw;
				s.y1 = ny + relY1 * nh;
				s.x2 = nx + relX2 * nw;
				s.y2 = ny + relY2 * nh;

				if (s.x3 !== undefined) {
					const relX3 = (init.x3 - bounds.minX) / bounds.w;
					const relY3 = (init.y3 - bounds.minY) / bounds.h;
					s.x3 = nx + relX3 * nw;
					s.y3 = ny + relY3 * nh;
				}
				if (s.cp1x !== undefined) {
					const relCx1 = (init.cp1x - bounds.minX) / bounds.w;
					const relCy1 = (init.cp1y - bounds.minY) / bounds.h;
					s.cp1x = nx + relCx1 * nw;
					s.cp1y = ny + relCy1 * nh;
				}
				if (s.cp2x !== undefined) {
					const relCx2 = (init.cp2x - bounds.minX) / bounds.w;
					const relCy2 = (init.cp2y - bounds.minY) / bounds.h;
					s.cp2x = nx + relCx2 * nw;
					s.cp2y = ny + relCy2 * nh;
				}
				if (s.radius !== undefined) {
					s.radius = init.radius * Math.max(scaleX, scaleY);
				}
				
				if (s.type === 'freehand' && s.points && init.points) {
					for(let j=0; j<s.points.length; j++) {
						const relPx = (init.points[j].x - bounds.minX) / bounds.w;
						const relPy = (init.points[j].y - bounds.minY) / bounds.h;
						s.points[j].x = nx + relPx * nw;
						s.points[j].y = ny + relPy * nh;
					}
				}
			});
			render();
			return;
		}

		if (this.mode === 'box-selecting') {
			app.selectionBox.w = p.x - app.selectionBox.startX;
			app.selectionBox.h = p.y - app.selectionBox.startY;
			render();
		}
	}

	handleHover(p) {
		let cursor = 'default';
		let hoveringSomething = false;

		if (app.selectedShapes.length > 1) {
			const bounds = getSelectionBounds(app.selectedShapes);
			const handle = this.getGroupHandleAtPos(bounds, p.x, p.y);
			if (handle) {
				cursor = handle.cursor;
				hoveringSomething = true;
			} else if (bounds && p.x >= bounds.minX && p.x <= bounds.maxX && p.y >= bounds.minY && p.y <= bounds.maxY) {
				cursor = 'move';
				hoveringSomething = true;
			}
		} else if (app.selectedShapes.length === 1) {
			const handle = getHandleAtPos(app.selectedShapes[0], p.x, p.y);
			if (handle) {
				cursor = handle.cursor || 'pointer';
				hoveringSomething = true;
			} else if (getShapeAtPos(p.x, p.y) === app.selectedShapes[0]) {
				cursor = 'move';
				hoveringSomething = true;
			}
		}

		if (!hoveringSomething) {
			const shape = getShapeAtPos(p.x, p.y);
			if (shape) {
				cursor = 'move';
				if (app.hoveredShape !== shape) {
					app.hoveredShape = shape;
					render();
				}
			} else {
				if (app.hoveredShape !== null) {
					app.hoveredShape = null;
					render();
				}
			}
		} else {
			if (app.hoveredShape !== null) {
				app.hoveredShape = null;
				render();
			}
		}

		canvas.style.cursor = cursor;
	}
	
	onMouseUp() {
		if (this.mode === 'box-selecting') {
			const bx = Math.min(app.selectionBox.startX, app.selectionBox.startX + app.selectionBox.w);
			const by = Math.min(app.selectionBox.startY, app.selectionBox.startY + app.selectionBox.h);
			const bw = Math.abs(app.selectionBox.w);
			const bh = Math.abs(app.selectionBox.h);

			if (bw > 2 || bh > 2) {
				const newlySelected = [];
				app.shapes.forEach(s => {
					const box = ShapeManager[s.type].getBoundingBox(s);
					if (box.maxX >= bx && box.minX <= bx + bw && box.maxY >= by && box.minY <= by + bh) {
						newlySelected.push(s);
					}
				});
				
				app.selectedShapes = newlySelected;
				if (app.selectedShapes.length > 0) {
					app.selectedShape = app.selectedShapes[0];
				} else {
					app.selectedShape = null;
				}
				updateUIFromShape(app.selectedShape);
			}
			app.selectionBox.active = false;
			this.isDragSelecting = false;
			render();
		}

		if (['moving', 'resizing', 'rotating', 'resizing-group', 'rotating-group'].includes(this.mode)) {
			generateCode();
			pushState();
		}
		
		this.mode = 'idle';
		this.handle = null;
		this.initialShapesState = [];
		this.groupBoundsStart = null;
		
		const lastP = getPos({ clientX: app.lastMouse.x, clientY: app.lastMouse.y });
		this.handleHover(lastP);
	}

	getGroupHandleAtPos(bounds, x, y) {
		if (!bounds) return null;
		const hitR = UI_CONSTANTS.HANDLE_HIT_RADIUS / app.view.scale;
		const cx = bounds.cx;
		const cy = bounds.cy;
		const rotY = bounds.minY - UI_CONSTANTS.ROTATION_HANDLE_OFFSET / app.view.scale;

		const handles = [
			{ x: bounds.minX, y: bounds.minY, pos: 'tl', cursor: 'nwse-resize' },
			{ x: cx, y: bounds.minY, pos: 'tm', cursor: 'ns-resize' },
			{ x: bounds.maxX, y: bounds.minY, pos: 'tr', cursor: 'nesw-resize' },
			{ x: bounds.maxX, y: cy, pos: 'mr', cursor: 'ew-resize' },
			{ x: bounds.maxX, y: bounds.maxY, pos: 'br', cursor: 'nwse-resize' },
			{ x: cx, y: bounds.maxY, pos: 'bm', cursor: 'ns-resize' },
			{ x: bounds.minX, y: bounds.maxY, pos: 'bl', cursor: 'nesw-resize' },
			{ x: bounds.minX, y: cy, pos: 'ml', cursor: 'ew-resize' },
			{ x: cx, y: rotY, pos: 'rotate', cursor: 'grabbing' }
		];

		for (const h of handles) {
			if (Math.abs(x - h.x) <= hitR && Math.abs(y - h.y) <= hitR) {
				return h;
			}
		}
		return null;
	}

	onActivate() {
		canvas.style.cursor = 'default';
		this.mode = 'idle';
	}
	
	onDeactivate() {
		app.selectedShape = null;
		app.selectedShapes = [];
		app.hoveredShape = null;
		render();
	}
}

export class DuplicateTool extends BaseTool {
	constructor() {
		super();
		this.config = TOOL_CONFIG['duplicate'];
		this.templates = [];
		this.referencePoint = { x: 0, y: 0 };
		this.isActive = false;
	}

	onActivate() {
		if (app.selectedShapes.length === 0) {
			setTool('select');
			return;
		}

		this.templates = app.selectedShapes.map(s => JSON.parse(JSON.stringify(s)));
		const bounds = getSelectionBounds(app.selectedShapes);
		this.referencePoint = { x: bounds.cx, y: bounds.cy };
		
		app.selectedShapes = [];
		app.selectedShape = null;
		this.isActive = true;
		canvas.style.cursor = this.config.cursor || 'copy';
		render();
	}

	onMouseMove(e) {
		if (!this.isActive || this.templates.length === 0) return;

		const p = getPos(e);
		
		render();

		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.translate(app.view.x, app.view.y);
		ctx.scale(app.view.scale, app.view.scale);
		ctx.globalAlpha = 0.5;

		const dx = p.x - this.referencePoint.x;
		const dy = p.y - this.referencePoint.y;

		this.templates.forEach(t => {
			const ghost = JSON.parse(JSON.stringify(t));
			ShapeManager[t.type].move(ghost, dx, dy);
			
			if (ghost.style) {
				ghost.style.opacity = 0.5;
				ghost.style.stroke = ghost.style.stroke || '#5e6ad2';
			}
			renderShape(ghost, ctx);
		});

		ctx.restore();
		
		coordsDisplay.textContent = `x: ${toTikZ(p.x)}, y: ${toTikZ(p.y, true)} | Clic pour tamponner`;
	}

	onMouseDown(e) {
		if (!this.isActive || this.templates.length === 0) return;

		const p = getPos(e);
		const dx = p.x - this.referencePoint.x;
		const dy = p.y - this.referencePoint.y;
		
		const newShapes = [];
		this.templates.forEach(t => {
			const newShape = JSON.parse(JSON.stringify(t));
			ShapeManager[t.type].move(newShape, dx, dy);
			app.shapes.push(newShape);
			newShapes.push(newShape);
		});

		generateCode();
		pushState();
		render(); 
		
		this.onMouseMove(e);
	}

	onDeactivate() {
		this.isActive = false;
		this.templates = [];
		canvas.style.cursor = 'default';
		render();
	}
}

export class DeleteTool extends BaseTool {
	constructor() {
		super();
		this.config = TOOL_CONFIG['delete'];
		this.isErasing = false;
		this.hasDeleted = false;
	}

	onMouseDown(e) {
		this.isErasing = true;
		this.hasDeleted = false;
		this.erase(e);
	}

	onMouseMove(e) {
		const p = getPos(e);
		
		render();

		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.translate(app.view.x, app.view.y);
		ctx.scale(app.view.scale, app.view.scale);

		if (this.isErasing) {
			this.erase(e);
		} else {
			const shape = getShapeAtPos(p.x, p.y);
			if (shape) {
				this.highlightShape(shape, ctx);
			}
		}

		this.drawEraserTip(ctx, p);
		ctx.restore();
	}

	onMouseUp(e) {
		this.isErasing = false;
		if (this.hasDeleted) {
			generateCode();
			pushState();
		}
		render();
	}

	erase(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape) {
			const index = app.shapes.indexOf(shape);
			if (index > -1) {
				app.shapes.splice(index, 1);
				app.selectedShapes = [];
				app.selectedShape = null;
				this.hasDeleted = true;
				
				render();
				
				const ctx = canvas.getContext('2d');
				ctx.save();
				ctx.translate(app.view.x, app.view.y);
				ctx.scale(app.view.scale, app.view.scale);
				this.drawEraserTip(ctx, p);
				ctx.restore();
			}
		}
	}

	highlightShape(shape, ctx) {
		ctx.save();
		ctx.strokeStyle = '#ff4757';
		ctx.lineWidth = 3 / app.view.scale;
		ctx.shadowColor = '#ff4757';
		ctx.shadowBlur = 15;
		
		if (shape.style.rotate) {
			const center = getShapeCenter(shape);
			ctx.translate(center.x, center.y);
			ctx.rotate(shape.style.rotate * Math.PI / 180);
			ctx.translate(-center.x, -center.y);
		}

		const shapeDef = ShapeManager[shape.type];
		if (shapeDef && shapeDef.render) {
			shapeDef.render(shape, ctx);
		}
		ctx.restore();
	}

	drawEraserTip(ctx, p) {
		const size = 15 / app.view.scale;
		ctx.beginPath();
		ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(255, 71, 87, 0.2)';
		ctx.strokeStyle = '#ff4757';
		ctx.lineWidth = 2 / app.view.scale;
		ctx.fill();
		ctx.stroke();
	}

	onActivate() {
		canvas.style.cursor = 'none';
		app.selectedShapes = [];
		app.selectedShape = null;
		render();
	}

	onDeactivate() {
		canvas.style.cursor = 'default';
		render();
	}
}

export class RaiseTool extends BaseTool {
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
			canvas.style.cursor = 'pointer';
			this.highlightShape(shape);
			const action = e.shiftKey ? "Monter d'un niveau" : "Mettre au premier plan";
			coordsDisplay.textContent = `${action} (Shift+Clic pour alterner)`;
		} else {
			canvas.style.cursor = this.config.cursor || 'default';
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
		canvas.style.cursor = this.config.cursor || 'default';
		app.selectedShape = null;
		render();
	}
}

export class LowerTool extends BaseTool {
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

export class EyedropperTool extends BaseTool {
	constructor() {
		super();
		this.config = TOOL_CONFIG['eyedropper'];
	}

	onMouseDown(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		if (shape) {
			const color = shape.style.stroke || '#000000';
			app.drawingStyle.stroke = color;
			
			const strokeColorInput = document.getElementById('strokeColor');
			if (strokeColorInput) {
				strokeColorInput.value = color;
			}
		}
		setTool('select');
	}

	onMouseMove(e) {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		render();
		if (shape) {
			this.highlightShape(shape, ctx);
		}
	}

	highlightShape(shape, ctx) {
		ctx.save();
		ctx.strokeStyle = '#5e6ad2';
		ctx.lineWidth = 3 / app.view.scale;
		ctx.shadowColor = '#5e6ad2';
		ctx.shadowBlur = 15;
		
		if (shape.style.rotate) {
			const center = getShapeCenter(shape);
			ctx.translate(center.x, center.y);
			ctx.rotate(shape.style.rotate * Math.PI / 180);
			ctx.translate(-center.x, -center.y);
		}

		const shapeDef = ShapeManager[shape.type];
		if (shapeDef && shapeDef.render) {
			shapeDef.render(shape, ctx);
		}
		ctx.restore();
	}
	
	onActivate() {
		canvas.parentElement.classList.add('eyedropper-active');
	}
	
	onDeactivate() {
		canvas.parentElement.classList.remove('eyedropper-active');
		render();
	}
}