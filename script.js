const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');
const coordsDisplay = document.getElementById('coords');

function generateInitialState() {
	const state = {};
	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const prop = config.propName || key;
		
		if (config.type === 'color-checkbox') {
			const isEnabled = config.enabledByDefault;
			state.hasFill = isEnabled;
			state[prop] = isEnabled ? config.defaultValue : null;
		} else {
			state[prop] = config.defaultValue;
		}
	}
	return state;
}

const initialState = generateInitialState();

const app = {
	shapes: [],
	history: [],
	historyIndex: -1,
	currentShape: null,
	selectedShape: null,
	selectedShapes: [],
	hoveredShape: null,
	selectionBox: { startX: 0, startY: 0, w: 0, h: 0, active: false },
	activeTool: null,
	drawingStyle: {},
	colors: new Map(),
	toolManager: {},
	view: { x: 0, y: 0, scale: 1 },
	isPanning: false,
	lastMouse: { x: 0, y: 0 },
	snapMarker: null,
	clipboard: [],
	nextShapeId: 0
};

let activeGuides = [];

class BaseTool {
	onMouseDown(e) {}
	onMouseMove(e) {}
	onMouseUp(e) {}
	onActivate() {}
	onDeactivate() {}
}

class DrawingTool extends BaseTool {
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

class SelectTool extends BaseTool {
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

class DuplicateTool extends BaseTool {
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

class DeleteTool extends BaseTool {
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

class RaiseTool extends BaseTool {
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

class LowerTool extends BaseTool {
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

class EyedropperTool extends BaseTool {
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

let currentState = { ...initialState };

function screenToWorld(sx, sy) {
	return {
		x: (sx - app.view.x) / app.view.scale,
		y: (sy - app.view.y) / app.view.scale
	};
}

function worldToScreen(wx, wy) {
	return {
		x: wx * app.view.scale + app.view.x,
		y: wy * app.view.scale + app.view.y
	};
}

function getShapeAnchors(shape) {
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

function createToolsUI() {
	const containers = {
		general: document.getElementById('tools-general'),
		drawing: document.getElementById('tools-drawing'),
		circuits: document.getElementById('tools-circuits'),
		optics: document.getElementById('tools-optics'),
		logic: document.getElementById('tools-logic'),
		flowchart: document.getElementById('tools-flowchart')
	};

	Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

	for (const toolId in TOOL_CONFIG) {
		const config = TOOL_CONFIG[toolId];
		const button = document.createElement('button');
		button.className = 'tool-btn';
		button.dataset.tool = toolId;
		button.innerHTML = config.icon;
		button.title = config.displayName;
		
		button.addEventListener('click', () => setTool(toolId));
		
		const targetContainer = containers[config.group] || containers.drawing;
		if (targetContainer) {
			targetContainer.appendChild(button);
		}
	}
}

function createSettingsUI() {
	const container = document.getElementById('settings-container');
	container.innerHTML = '';
	const settingsGroups = {};

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const groupName = config.group || `group-${key}`;

		if (!settingsGroups[groupName]) {
			settingsGroups[groupName] = {
				configs: [],
				options: config.groupOptions || {}
			};
		}
		settingsGroups[groupName].configs.push({ key, ...config });
	}

	for (const groupName in settingsGroups) {
		const groupInfo = settingsGroups[groupName];
		const groupContainer = document.createElement('div');
		
		if (groupInfo.options.type === 'row') {
			groupContainer.className = 'control-row';
			groupContainer.style.display = 'flex';
			groupContainer.style.gap = '8px';
		} else {
			groupContainer.className = 'control-group-wrapper';
		}

		groupInfo.configs.forEach(config => {
			const key = config.key;
			const controlWrapper = document.createElement('div');
			controlWrapper.className = 'control-group';
			controlWrapper.id = `wrapper-${key}`;
			if(groupInfo.options.type === 'row') controlWrapper.style.flex = '1';
			
			let controlHtml = '';

			switch (config.type) {
				case 'textarea':
					controlHtml = `
						<label>${config.label}</label>
						<textarea id="${key}" data-setting="${key}" class="settings-input" rows="2"></textarea>`;
					break;
				case 'select':
					controlHtml = `
						<label>${config.label}</label>
						<div class="select-wrapper">
							<select id="${key}" data-setting="${key}">
								${Object.entries(config.options).map(([val, text]) => `<option value="${val}">${text}</option>`).join('')}
							</select>
						</div>`;
					break;
				case 'range':
					const isPercent = config.unit === '%';
					const displayValue = isPercent ? `${config.defaultValue * 100}${config.unit}` : `${config.defaultValue}${config.unit}`;
					controlHtml = `
						<div class="slider-row">
							<label>${config.label}</label>
							<span id="${key}Value" style="font-family:'SF Mono', monospace; font-size: 0.7rem; opacity:0.7;">${displayValue}</span>
						</div>
						<input type="range" id="${key}" data-setting="${key}" min="${config.min}" max="${config.max}" step="${config.step}">`;
					break;
				case 'checkbox':
					controlHtml = `
						<div style="display: flex; align-items: center; justify-content: space-between; height: 32px;">
							<label style="margin: 0; cursor: pointer;" for="${key}">${config.label}</label>
							<input type="checkbox" id="${key}" data-setting="${key}">
						</div>`;
					break;
				case 'color':
					controlHtml = `
						<div class="color-input">
							<label>${config.label}</label>
							<input type="color" id="${key}" data-setting="${key}" style="height:32px; width:100%;">
						</div>`;
					break;
				case 'color-checkbox':
					controlHtml = `
						<div class="color-input">
							<div class="slider-row">
								<label>${config.label}</label>
								<input type="checkbox" id="hasFill" data-setting="hasFill">
							</div>
							<input type="color" id="${key}" data-setting="${key}" style="height:32px; width:100%;">
						</div>`;
					break;
			}
			controlWrapper.innerHTML = controlHtml;
			groupContainer.appendChild(controlWrapper);
		});
		container.appendChild(groupContainer);
	}
}

function createGlobalSettingsUI() {
	const container = document.getElementById('global-settings-container');
	container.innerHTML = '';

	for (const key in GLOBAL_SETTINGS_CONFIG) {
		const config = GLOBAL_SETTINGS_CONFIG[key];
		const wrapper = document.createElement('div');
		wrapper.className = 'control-group';
		
		let html = '';
		if (config.type === 'text') {
			html = `<label>${config.label}</label><input type="text" id="${key}" data-global="${key}" value="${config.defaultValue}">`;
		} else if (config.type === 'range') {
			html = `
				<div class="slider-row">
					<label>${config.label}</label>
					<span id="${key}Value">${config.defaultValue}${config.unit}</span>
				</div>
				<input type="range" id="${key}" data-global="${key}" min="${config.min}" max="${config.max}" step="${config.step}" value="${config.defaultValue}">`;
		} else if (config.type === 'color') {
			html = `<label>${config.label}</label><input type="color" id="${key}" data-global="${key}" value="${config.defaultValue}">`;
		} else if (config.type === 'select') {
			html = `
				<label>${config.label}</label>
				<div class="select-wrapper">
					<select id="${key}" data-global="${key}">
						${Object.entries(config.options).map(([val, text]) => `<option value="${val}" ${val === config.defaultValue ? 'selected' : ''}>${text}</option>`).join('')}
					</select>
				</div>`;
		} else if (config.type === 'checkbox') {
			html = `
				<div style="display: flex; align-items: center; justify-content: space-between; height: 32px;">
					<label style="margin: 0; cursor: pointer;" for="${key}">${config.label}</label>
					<input type="checkbox" id="${key}" data-global="${key}" ${config.defaultValue ? 'checked' : ''}>
				</div>`;
		}
		
		wrapper.innerHTML = html;
		container.appendChild(wrapper);
	}
}

function createGeometryUI(s) {
	const container = document.getElementById('geometry-container');
	container.innerHTML = '';
	
	const props = [
		{ k: 'x1', label: 'X1' }, { k: 'y1', label: 'Y1', isY: true },
		{ k: 'x2', label: 'X2' }, { k: 'y2', label: 'Y2', isY: true },
		{ k: 'x3', label: 'X3' }, { k: 'y3', label: 'Y3', isY: true },
		{ k: 'cp1x', label: 'CX1' }, { k: 'cp1y', label: 'CY1', isY: true },
		{ k: 'cp2x', label: 'CX2' }, { k: 'cp2y', label: 'CY2', isY: true },
		{ k: 'radius', label: 'R', isScalar: true }
	];

	props.forEach(p => {
		if (s[p.k] !== undefined) {
			const row = document.createElement('div');
			row.className = 'geo-row';
			
			const label = document.createElement('label');
			label.textContent = p.label;
			
			const input = document.createElement('input');
			input.type = 'number';
			input.className = 'geo-input';
			input.step = '0.1';
			
			let val;
			if (p.isScalar) val = toTikZ(s[p.k]);
			else val = toTikZ(s[p.k], p.isY);
			
			input.value = val;
			
			input.addEventListener('change', (e) => {
				const newVal = parseFloat(e.target.value);
				if (isNaN(newVal)) return;

				let pxVal;
				if (p.isScalar) pxVal = newVal * UI_CONSTANTS.SCALE;
				else if (p.isY) pxVal = canvas.height - (newVal * UI_CONSTANTS.SCALE);
				else pxVal = newVal * UI_CONSTANTS.SCALE;

				s[p.k] = pxVal;
				
				render();
				generateCode();
				pushState();
			});

			row.appendChild(label);
			row.appendChild(input);
			container.appendChild(row);
		}
	});
}

function resizeCanvas() {
	const container = canvas.parentElement;
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
	render();
}

function setTool(toolName) {
	if (app.activeTool && app.activeTool.onDeactivate) {
		app.activeTool.onDeactivate();
	}
	
	document.querySelectorAll('.tool-btn').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.tool === toolName);
	});

	app.activeTool = app.toolManager[toolName];
	updateSettingsVisibility(toolName);

	if (app.activeTool && app.activeTool.onActivate) {
		app.activeTool.onActivate();
	}
	saveToLocalStorage();
	
	if (app.activeTool instanceof EyedropperTool) {
		canvas.style.cursor = 'none';
	} else if(app.activeTool && app.activeTool.config) {
		canvas.style.cursor = app.activeTool.config.cursor || 'default';
	} else {
		canvas.style.cursor = 'default';
	}
}

function snap(val) {
	return Math.round(val / UI_CONSTANTS.GRID_SIZE) * UI_CONSTANTS.GRID_SIZE;
}

function drawArrow(ctx, x, y, angle, headType, scale, lineWidth) {
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

function drawSelection(s, ctx) {
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

function renderShape(s, ctx) {
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

function render() {
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

function buildTikzOptions(s) {
	let opts = [];
	const style = s.style;

	if (style.arrow && style.arrow !== 'none') {
		const head = style.arrowHead ? style.arrowHead.charAt(0).toUpperCase() + style.arrowHead.slice(1) : 'Stealth';
		const scale = style.arrowScale || 1;
		let headStr = head === 'Triangle 45' ? 'Triangle[angle=45:1pt]' : (head === 'To' ? 'To' : head);
		opts.push(scale !== 1 ? `>={${headStr}[scale=${scale}]}` : `>={${headStr}}`);
	}

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		if (config.excludeFrom && config.excludeFrom.includes(s.type)) continue;
		if (['arrowHead', 'arrowScale', 'textWeight', 'textSlant', 'textFont'].includes(key)) continue;

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
	
	return opts.length ? `[${opts.join(', ')}]` : '';
}

function onMouseDown(e) {
	if (app.activeTool instanceof EyedropperTool) {
		app.activeTool.onMouseDown(e);
		return;
	}

	if (e.button === 1 || e.code === 'Space' || (e.shiftKey && e.button === 0 && app.activeTool === app.toolManager.select)) {
		app.isPanning = true;
		app.lastMouse = { x: e.clientX, y: e.clientY };
		canvas.parentElement.classList.add('grabbing');
		return;
	}

	if (app.activeTool && app.activeTool.onMouseDown) {
		app.activeTool.onMouseDown(e);
	}
}

function onMouseMove(e) {
	if (app.isPanning) {
		const dx = e.clientX - app.lastMouse.x;
		const dy = e.clientY - app.lastMouse.y;
		app.view.x += dx;
		app.view.y += dy;
		app.lastMouse = { x: e.clientX, y: e.clientY };
		render();
		return;
	}

	const p = getPos(e);
	coordsDisplay.textContent = `x: ${toTikZ(p.x)}, y: ${toTikZ(p.y, true)} | Zoom: ${Math.round(app.view.scale * 100)}%`;
	
	if (app.activeTool && app.activeTool.onMouseMove) {
		app.activeTool.onMouseMove(e);
	}
}

function onMouseUp(e) {
	if (app.isPanning) {
		app.isPanning = false;
		canvas.parentElement.classList.remove('grabbing');
		return;
	}

	if (app.activeTool && app.activeTool.onMouseUp) {
		app.activeTool.onMouseUp(e);
	}
}

function clearAll() {
	app.shapes = [];
	app.selectedShapes = [];
	app.selectedShape = null;
	app.hoveredShape = null;
	app.selectionBox = { startX: 0, startY: 0, w: 0, h: 0, active: false };
	app.history = [];
	app.historyIndex = -1;
	app.nextShapeId = 0;
	pushState();
	render();
	generateCode();
	saveToLocalStorage();
}

function copySelection() {
	if (app.selectedShapes.length > 0) {
		app.clipboard = app.selectedShapes.map(s => JSON.parse(JSON.stringify(s)));
	}
}

function cutSelection() {
	if (app.selectedShapes.length > 0) {
		copySelection();
		const tool = app.toolManager['delete'];
		if (tool && tool.deleteSelected) {
			tool.deleteSelected();
		} else {
			app.selectedShapes.forEach(s => {
				const idx = app.shapes.indexOf(s);
				if (idx > -1) app.shapes.splice(idx, 1);
			});
			app.selectedShapes = [];
			app.selectedShape = null;
			generateCode();
			pushState();
			render();
		}
	}
}

function pasteSelection(atMouse = false) {
	if (!app.clipboard || app.clipboard.length === 0) return;

	const newShapes = app.clipboard.map(s => JSON.parse(JSON.stringify(s)));
	const bounds = getSelectionBounds(newShapes);
	
	let dx = 0;
	let dy = 0;

	if (atMouse) {
		const mouseWorld = screenToWorld(app.lastMouse.x, app.lastMouse.y);
		dx = mouseWorld.x - bounds.cx;
		dy = mouseWorld.y - bounds.cy;
	} else {
		const visibleWidth = canvas.width / app.view.scale;
		const visibleHeight = canvas.height / app.view.scale;
		const centerX = -app.view.x / app.view.scale + visibleWidth / 2;
		const centerY = -app.view.y / app.view.scale + visibleHeight / 2;
		
		dx = centerX - bounds.cx;
		dy = centerY - bounds.cy;
		
		if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
			dx = UI_CONSTANTS.GRID_SIZE;
			dy = UI_CONSTANTS.GRID_SIZE;
		}
	}

	newShapes.forEach(s => {
		s.id = app.nextShapeId++;
		ShapeManager[s.type].move(s, dx, dy);
		app.shapes.push(s);
	});

	app.selectedShapes = newShapes;
	app.selectedShape = newShapes.length > 0 ? newShapes[0] : null;
	
	if (app.activeTool !== app.toolManager.select) {
		setTool('select');
	}

	generateCode();
	pushState();
	render();
}

function updateUndoRedoUI() {
	document.getElementById('undoBtn').disabled = app.historyIndex <= 0;
	document.getElementById('redoBtn').disabled = app.historyIndex >= app.history.length - 1;
}

function pushState() {
	app.history = app.history.slice(0, app.historyIndex + 1);
	
	const selectionIndices = app.selectedShapes.map(selected => app.shapes.indexOf(selected)).filter(i => i !== -1);
	
	const state = {
		shapes: app.shapes,
		selection: selectionIndices
	};

	app.history.push(JSON.stringify(state));
	app.historyIndex++;
	updateUndoRedoUI();
	saveToLocalStorage();
}

function undo() {
	if (app.historyIndex > 0) {
		app.historyIndex--;
		const stateData = JSON.parse(app.history[app.historyIndex]);
		
		if (Array.isArray(stateData)) {
			app.shapes = stateData;
			app.selectedShapes = [];
		} else {
			app.shapes = stateData.shapes || [];
			app.selectedShapes = [];
			if (stateData.selection && Array.isArray(stateData.selection)) {
				stateData.selection.forEach(index => {
					if (app.shapes[index]) {
						app.selectedShapes.push(app.shapes[index]);
					}
				});
			}
		}
		
		app.selectedShape = app.selectedShapes.length > 0 ? app.selectedShapes[0] : null;
		
		render();
		generateCode();
		updateUIFromShape(app.selectedShape);
		updateUndoRedoUI();
		saveToLocalStorage();
	}
}

function redo() {
	if (app.historyIndex < app.history.length - 1) {
		app.historyIndex++;
		const stateData = JSON.parse(app.history[app.historyIndex]);
		
		if (Array.isArray(stateData)) {
			app.shapes = stateData;
			app.selectedShapes = [];
		} else {
			app.shapes = stateData.shapes || [];
			app.selectedShapes = [];
			if (stateData.selection && Array.isArray(stateData.selection)) {
				stateData.selection.forEach(index => {
					if (app.shapes[index]) {
						app.selectedShapes.push(app.shapes[index]);
					}
				});
			}
		}

		app.selectedShape = app.selectedShapes.length > 0 ? app.selectedShapes[0] : null;

		render();
		generateCode();
		updateUIFromShape(app.selectedShape);
		updateUndoRedoUI();
		saveToLocalStorage();
	}
}

function getSelectionBounds(shapes) {
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

function getHandleAtPos(shape, x, y) {
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

function getPos(e, refPoint = null) {
	const rect = canvas.getBoundingClientRect();
	const rawScreenX = e.clientX - rect.left;
	const rawScreenY = e.clientY - rect.top;
	const worldPos = screenToWorld(rawScreenX, rawScreenY);
	
	let bestX = worldPos.x;
	let bestY = worldPos.y;

	app.snapMarker = null;
	activeGuides = [];

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

function getShapeAtPos(x, y) {
	for (let i = app.shapes.length - 1; i >= 0; i--) {
		const s = app.shapes[i];
		if (ShapeManager[s.type].hitTest(s, x, y)) {
			return s;
		}
	}
	return null;
}

function getHandles(s) {
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

function copyToClipboard() {
	const codeText = output.textContent;
	const copyBtn = document.getElementById('copyBtn');
	if (copyBtn.dataset.busy === 'true') return;
	
	copyBtn.dataset.busy = 'true';
	const originalContent = copyBtn.innerHTML;

	const showFeedback = (success) => {
		if (success) {
			copyBtn.innerHTML = '<i class="ti ti-check"></i> Copié !';
			copyBtn.classList.add('btn-copied');
			
			setTimeout(() => {
				copyBtn.innerHTML = originalContent;
				copyBtn.classList.remove('btn-copied');
				copyBtn.dataset.busy = 'false';
			}, 2000);

		} else {
			copyBtn.innerHTML = '<i class="ti ti-x"></i> Erreur';
			copyBtn.classList.remove('btn-primary', 'btn-copied');
			copyBtn.classList.add('btn-danger');

			setTimeout(() => {
				copyBtn.innerHTML = originalContent;
				copyBtn.classList.remove('btn-danger');
				copyBtn.classList.add('btn-primary');
				copyBtn.dataset.busy = 'false';
			}, 2000);
		}
	};

	if (navigator.clipboard) {
		navigator.clipboard.writeText(codeText)
			.then(() => showFeedback(true))
			.catch(err => {
				console.error('Could not copy text: ', err);
				showFeedback(false);
			});
	} else {
		const tempTextArea = document.createElement('textarea');
		tempTextArea.value = codeText;
		document.body.appendChild(tempTextArea);
		tempTextArea.select();
		try {
			const successful = document.execCommand('copy');
			showFeedback(successful);
		} catch (err) {
			console.error('Fallback: Oops, unable to copy', err);
			showFeedback(false);
		}
		document.body.removeChild(tempTextArea);
	}
}

function setupCollapsibles() {
	document.querySelectorAll('.panel-header').forEach(header => {
		header.addEventListener('click', () => {
			const icon = header.querySelector('.toggle-icon');
			const body = header.nextElementSibling;
			if (body) {
				const isCollapsed = body.style.display === 'none';
				body.style.display = isCollapsed ? 'block' : 'none';
				header.classList.toggle('collapsed', !isCollapsed);
				if (icon) {
					icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
				}
			}
		});
	});
}

function setupTabs() {
	const tabBtns = document.querySelectorAll('.tab-btn');
	
	tabBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			const parent = btn.closest('.panel-body');
			if (!parent) return;

			parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
			parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
			
			btn.classList.add('active');
			const tabId = `tab-${btn.dataset.tab}`;
			const target = document.getElementById(tabId);
			if (target) {
				target.classList.add('active');
			}
		});
	});
}

function setupKeyboardShortcuts() {
	window.addEventListener('keydown', (e) => {
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (app.selectedShapes.length > 0) {
				const tool = app.toolManager['delete'];
				if (tool && tool.deleteSelected) tool.deleteSelected();
				else {
					app.selectedShapes.forEach(s => {
						const idx = app.shapes.indexOf(s);
						if (idx > -1) app.shapes.splice(idx, 1);
					});
					app.selectedShapes = [];
					app.selectedShape = null;
					generateCode();
					pushState();
					render();
				}
			}
		}

		if (e.ctrlKey || e.metaKey) {
			if (e.key === 'c') {
				e.preventDefault();
				copySelection();
			} else if (e.key === 'x') {
				e.preventDefault();
				cutSelection();
			} else if (e.key === 'v') {
				e.preventDefault();
				pasteSelection(true);
			} else if (e.key === 'd') {
				e.preventDefault();
				if (app.selectedShapes.length > 0) {
					copySelection();
					pasteSelection(false);
				}
			} else if (e.key === 'z') {
				e.preventDefault();
				undo();
			} else if (e.key === 'y' || (e.shiftKey && e.key === 'Z')) {
				e.preventDefault();
				redo();
			} else if (e.key === 'a') {
				e.preventDefault();
				app.selectedShapes = [...app.shapes];
				if(app.selectedShapes.length > 0) {
					app.selectedShape = app.selectedShapes[0];
					updateUIFromShape(app.selectedShape);
				}
				setTool('select');
				render();
			}
		}

		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
			if (app.selectedShapes.length > 0) {
				e.preventDefault();
				const step = e.shiftKey ? 1 : UI_CONSTANTS.GRID_SIZE;
				let dx = 0;
				let dy = 0;
				
				if (e.key === 'ArrowUp') dy = -step;
				if (e.key === 'ArrowDown') dy = step;
				if (e.key === 'ArrowLeft') dx = -step;
				if (e.key === 'ArrowRight') dx = step;

				app.selectedShapes.forEach(s => ShapeManager[s.type].move(s, dx, dy));
				updateUIFromShape(app.selectedShape);
				render();
				generateCode();
			}
		}
	});
	
	window.addEventListener('keyup', (e) => {
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
			if (app.selectedShapes.length > 0) {
				pushState();
			}
		}
	});
}

function setupOutputInteraction() {
	output.addEventListener('click', (e) => {
		const span = e.target.closest('.tikz-number');
		if (!span) return;

		const originalValue = span.textContent;
		const input = document.createElement('input');
		input.type = 'number';
		input.className = 'tikz-input';
		input.value = originalValue;
		input.step = 0.01;
		input.style.width = `${(originalValue.length + 2) * 8}px`;
		input.style.textAlign = 'center';

		span.replaceWith(input);
		input.focus();
		input.select();

		const finishEditing = (applyChanges) => {
			if (applyChanges) {
				const shapeId = parseInt(span.dataset.shapeId, 10);
				const property = span.dataset.property;
				const isY = span.dataset.isY === 'true';
				const newValue = input.value;

				const shape = app.shapes.find(s => s.id === shapeId);
				if (shape) {
					const pxValue = tikzToPx(newValue, isY);
					const scalarValue = tikzToPx(newValue, false);

					switch (property) {
						case 'radius':
						case 'length': {
							const dx = shape.x2 - shape.x1;
							const dy = shape.y2 - shape.y1;
							const angle = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx);
							shape.x2 = shape.x1 + scalarValue * Math.cos(angle);
							shape.y2 = shape.y1 + scalarValue * Math.sin(angle);
							if (property === 'radius' && shape.radius !== undefined) {
								shape.radius = scalarValue;
							}
							break;
						}
						case 'width': {
							const w = scalarValue;
							const cx = (shape.x1 + shape.x2) / 2;
							shape.x1 = cx - w / 2;
							shape.x2 = cx + w / 2;
							break;
						}
						case 'height': {
							const h = scalarValue;
							const cy = (shape.y1 + shape.y2) / 2;
							shape.y1 = cy - h / 2;
							shape.y2 = cy + h / 2;
							break;
						}
						case 'cx': {
							const w = shape.x2 - shape.x1;
							shape.x1 = pxValue - w / 2;
							shape.x2 = pxValue + w / 2;
							if (shape.cp1x !== undefined) {
								const dcx = pxValue - ((shape.x1 + shape.x2) / 2);
								shape.cp1x += dcx;
								shape.cp2x += dcx;
							}
							break;
						}
						case 'cy': {
							const h = Math.abs(shape.y2 - shape.y1);
							shape.y1 = pxValue - h / 2;
							shape.y2 = pxValue + h / 2;
							if (shape.cp1y !== undefined) {
								const dcy = pxValue - ((shape.y1 + shape.y2) / 2);
								shape.cp1y += dcy;
								shape.cp2y += dcy;
							}
							break;
						}
						case 'rx':
							shape.x2 = shape.x1 + scalarValue;
							break;
						case 'ry':
							shape.y2 = shape.y1 + scalarValue;
							break;
						default:
							if (property.startsWith('points.')) {
								const parts = property.split('.');
								const index = parseInt(parts[1], 10);
								const coord = parts[2];
								if (shape.points && shape.points[index]) {
									shape.points[index][coord] = pxValue;
								}
							} else {
								shape[property] = pxValue;
							}
							break;
					}

					render();
					generateCode();
					pushState();
					updateUIFromShape(shape);
				}
			} else {
				input.replaceWith(span);
			}
		};

		input.addEventListener('blur', () => finishEditing(true));
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				finishEditing(true);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				finishEditing(false);
			}
		});
	});
}

function setupTextEditing() {
	const textEditor = document.getElementById('text-editor');
	let editingShape = null;

	const finishEditing = (save) => {
		if (!editingShape) return;
		
		if (save) {
			editingShape.style.text = textEditor.value;
			generateCode();
			pushState();
			render();
			updateUIFromShape(editingShape);
		}
		
		textEditor.style.display = 'none';
		editingShape = null;
	};

	canvas.addEventListener('dblclick', (e) => {
		const p = getPos(e);
		const shape = getShapeAtPos(p.x, p.y);
		
		if (shape && shape.type === 'text') {
			editingShape = shape;
			
			const screenPos = worldToScreen(shape.x1, shape.y1);
			const style = shape.style;
			
			const sizeMap = {
				'tiny': 8, 'scriptsize': 10, 'footnotesize': 12, 'small': 13,
				'normalsize': 16, 'large': 18, 'Large': 22, 'LARGE': 26, 'huge': 30, 'Huge': 36
			};
			const fontMap = { 'serif': 'serif', 'sans': 'sans-serif', 'mono': 'monospace' };

			const fontSize = (sizeMap[style.textSize] || 16) * app.view.scale;
			
			textEditor.value = style.text || '';
			textEditor.style.display = 'block';
			textEditor.style.fontSize = `${fontSize}px`;
			textEditor.style.fontFamily = fontMap[style.textFont] || 'sans-serif';
			textEditor.style.fontWeight = style.textWeight === 'bfseries' ? 'bold' : 'normal';
			textEditor.style.fontStyle = style.textSlant === 'itshape' ? 'italic' : 'normal';
			textEditor.style.color = style.stroke || '#000000';

			const lines = textEditor.value.split('\\\\');
			const lineHeight = fontSize * 1.2;
			textEditor.style.height = `${lines.length * lineHeight + 4}px`;
			textEditor.style.width = 'auto';
			
			const tempCtx = canvas.getContext('2d');
			tempCtx.font = `${textEditor.style.fontStyle} ${textEditor.style.fontWeight} ${fontSize}px ${textEditor.style.fontFamily}`;
			let maxWidth = 0;
			lines.forEach(line => {
				maxWidth = Math.max(maxWidth, tempCtx.measureText(line).width);
			});
			textEditor.style.width = `${maxWidth + 10}px`;

			textEditor.style.left = `${screenPos.x - textEditor.offsetWidth / 2}px`;
			textEditor.style.top = `${screenPos.y - textEditor.offsetHeight / 2}px`;

			textEditor.focus();
			textEditor.select();
		}
	});

	textEditor.addEventListener('blur', () => finishEditing(true));
	textEditor.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			finishEditing(true);
		} else if (e.key === 'Escape') {
			finishEditing(false);
		}
	});
}

function alignSelected(mode) {
	if (app.selectedShapes.length === 0) return;

	const alignToPage = document.getElementById('alignRelative').checked;
	let minX, maxX, minY, maxY, cx, cy;

	if (alignToPage) {
		const visibleWidth = canvas.width / app.view.scale;
		const visibleHeight = canvas.height / app.view.scale;
		minX = -app.view.x / app.view.scale;
		minY = -app.view.y / app.view.scale;
		maxX = minX + visibleWidth;
		maxY = minY + visibleHeight;
		cx = (minX + maxX) / 2;
		cy = (minY + maxY) / 2;
	} else {
		if (app.selectedShapes.length < 2) return;
		const bounds = getSelectionBounds(app.selectedShapes);
		minX = bounds.minX;
		minY = bounds.minY;
		maxX = bounds.maxX;
		maxY = bounds.maxY;
		cx = bounds.cx;
		cy = bounds.cy;
	}

	app.selectedShapes.forEach(s => {
		const box = ShapeManager[s.type].getBoundingBox(s);
		const sCx = (box.minX + box.maxX) / 2;
		const sCy = (box.minY + box.maxY) / 2;
		let dx = 0, dy = 0;

		switch(mode) {
			case 'left': dx = minX - box.minX; break;
			case 'center': dx = cx - sCx; break;
			case 'right': dx = maxX - box.maxX; break;
			case 'top': dy = minY - box.minY; break;
			case 'middle': dy = cy - sCy; break;
			case 'bottom': dy = maxY - box.maxY; break;
		}

		ShapeManager[s.type].move(s, dx, dy);
	});

	render();
	generateCode();
	pushState();
}

function distributeSelected(axis) {
	if (app.selectedShapes.length < 2) return;

	const shapes = [...app.selectedShapes];
	const spacingInput = document.getElementById('distSpacing');
	const manualSpacing = spacingInput.value ? parseFloat(spacingInput.value) * UI_CONSTANTS.SCALE : null;

	if (axis === 'h') {
		shapes.sort((a, b) => ShapeManager[a.type].getBoundingBox(a).minX - ShapeManager[b.type].getBoundingBox(b).minX);
		
		if (manualSpacing !== null) {
			let currentX = ShapeManager[shapes[0].type].getBoundingBox(shapes[0]).minX;
			shapes.forEach((s) => {
				const box = ShapeManager[s.type].getBoundingBox(s);
				const dx = currentX - box.minX;
				ShapeManager[s.type].move(s, dx, 0);
				currentX += (box.maxX - box.minX) + manualSpacing;
			});
		} else {
			if (shapes.length < 3) return;
			const first = ShapeManager[shapes[0].type].getBoundingBox(shapes[0]);
			const last = ShapeManager[shapes[shapes.length-1].type].getBoundingBox(shapes[shapes.length-1]);
			
			let totalWidth = 0;
			shapes.forEach(s => {
				const b = ShapeManager[s.type].getBoundingBox(s);
				totalWidth += (b.maxX - b.minX);
			});
			totalWidth -= (first.maxX - first.minX);
			totalWidth -= (last.maxX - last.minX);

			const totalSpan = last.minX - first.maxX;
			const gap = totalSpan / (shapes.length - 1); 
			
			const startX = first.minX;
			const totalDist = last.maxX - first.minX;
			
			const centers = shapes.map(s => {
				const b = ShapeManager[s.type].getBoundingBox(s);
				return (b.minX + b.maxX) / 2;
			});
			
			const step = (centers[centers.length-1] - centers[0]) / (shapes.length - 1);
			
			shapes.forEach((s, i) => {
				if (i === 0 || i === shapes.length - 1) return;
				const box = ShapeManager[s.type].getBoundingBox(s);
				const currentCenter = (box.minX + box.maxX) / 2;
				const targetCenter = centers[0] + step * i;
				ShapeManager[s.type].move(s, targetCenter - currentCenter, 0);
			});
		}
	} else {
		shapes.sort((a, b) => ShapeManager[a.type].getBoundingBox(a).minY - ShapeManager[b.type].getBoundingBox(b).minY);
		
		if (manualSpacing !== null) {
			let currentY = ShapeManager[shapes[0].type].getBoundingBox(shapes[0]).minY;
			shapes.forEach((s) => {
				const box = ShapeManager[s.type].getBoundingBox(s);
				const dy = currentY - box.minY;
				ShapeManager[s.type].move(s, 0, dy);
				currentY += (box.maxY - box.minY) + manualSpacing;
			});
		} else {
			if (shapes.length < 3) return;
			const centers = shapes.map(s => {
				const b = ShapeManager[s.type].getBoundingBox(s);
				return (b.minY + b.maxY) / 2;
			});
			
			const step = (centers[centers.length-1] - centers[0]) / (shapes.length - 1);

			shapes.forEach((s, i) => {
				if (i === 0 || i === shapes.length - 1) return;
				const box = ShapeManager[s.type].getBoundingBox(s);
				const currentCenter = (box.minY + box.maxY) / 2;
				const targetCenter = centers[0] + step * i;
				ShapeManager[s.type].move(s, 0, targetCenter - currentCenter);
			});
		}
	}

	render();
	generateCode();
	pushState();
}

function matchSize(dimension) {
	if (app.selectedShapes.length < 2) return;
	
	let maxWidth = 0;
	let maxHeight = 0;
	
	app.selectedShapes.forEach(s => {
		const box = ShapeManager[s.type].getBoundingBox(s);
		maxWidth = Math.max(maxWidth, box.maxX - box.minX);
		maxHeight = Math.max(maxHeight, box.maxY - box.minY);
	});

	app.selectedShapes.forEach(s => {
		const box = ShapeManager[s.type].getBoundingBox(s);
		const cx = (box.minX + box.maxX) / 2;
		const cy = (box.minY + box.maxY) / 2;
		const currentW = box.maxX - box.minX;
		const currentH = box.maxY - box.minY;
		
		let targetW = currentW;
		let targetH = currentH;

		if (dimension === 'width') targetW = maxWidth;
		if (dimension === 'height') targetH = maxHeight;
		
		if (s.type === 'rect' || s.type === 'image' || s.type === 'ellipse' || s.type === 'flow_process' || s.type === 'flow_start' || s.type === 'flow_decision') {
			const halfW = targetW / 2;
			const halfH = targetH / 2;
			s.x1 = cx - halfW;
			s.x2 = cx + halfW;
			s.y1 = cy - halfH;
			s.y2 = cy + halfH;
		} else if (s.type === 'circle') {
			const size = dimension === 'width' ? maxWidth : maxHeight;
			const r = size / 2;
			s.x1 = cx; s.y1 = cy; 
			s.x2 = cx + r; s.y2 = cy; 
		}
	});

	render();
	generateCode();
	pushState();
}

function rotateSelected(angle) {
	if (app.selectedShapes.length === 0) return;

	const bounds = getSelectionBounds(app.selectedShapes);
	const rad = angle * Math.PI / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	app.selectedShapes.forEach(s => {
		const center = getShapeCenter(s);
		const dx = center.x - bounds.cx;
		const dy = center.y - bounds.cy;
		
		const nx = bounds.cx + dx * cos - dy * sin;
		const ny = bounds.cy + dx * sin + dy * cos;
		
		ShapeManager[s.type].move(s, nx - center.x, ny - center.y);
		
		const oldRot = s.style.rotate || 0;
		s.style.rotate = (oldRot + angle + 360) % 360;
	});

	render();
	generateCode();
	pushState();
}

function updateSetting(element) {
	const key = element.dataset.setting || element.dataset.global;
	const isGlobal = !!element.dataset.global;

	if (key === 'hasFill') {
		const value = element.checked;
		const fillColorInput = document.getElementById('fillColor');
		fillColorInput.style.opacity = value ? '1' : '0.2';
		fillColorInput.style.pointerEvents = value ? 'auto' : 'none';
		fillColorInput.disabled = !value;
		
		const applyTo = (app.selectedShapes.length > 0) ? app.selectedShapes : [app.selectedShape || {style: app.drawingStyle}];
		applyTo.forEach(item => {
			const targetFill = item.style || item;
			if (!value) targetFill.fill = null;
			else targetFill.fill = fillColorInput.value;
		});

		if (app.selectedShape) {
			render();
			generateCode();
			pushState();
		}
		saveToLocalStorage();
		return;
	}

	const config = isGlobal ? GLOBAL_SETTINGS_CONFIG[key] : SETTINGS_CONFIG[key];
	if (!config) return;

	let value;
	if (element.type === 'checkbox') {
		value = element.checked;
	} else if (config.type === 'range' || (config.type === 'number' && !isNaN(parseFloat(element.value)))) {
		value = parseFloat(element.value);
	} else {
		value = element.value;
	}

	const propName = config.propName || key;
	
	if (isGlobal) {
		app.drawingStyle[propName] = value;
	} else {
		app.drawingStyle[propName] = value; 
		if (app.selectedShapes.length > 0) {
			app.selectedShapes.forEach(s => {
				s.style[propName] = value;
			});
		}
	}

	if (config.type === 'range') {
		const valueSpan = document.getElementById(`${key}Value`);
		if (valueSpan) {
			const unit = config.unit || '';
			valueSpan.textContent = key === 'opacity' ? `${Math.round(value * 100)}%` : `${value}${unit}`;
		}
	}

	if (key === 'canvasZoom') {
		return; 
	}

	if (key === 'stageColor') {
		canvas.parentElement.style.backgroundColor = value;
	}

	if (key === 'arrowStyle' || key === 'freehandMode') {
		const toolName = app.activeTool === app.toolManager.select ? 'select' : (app.activeTool.shapeType || 'select');
		const shapeType = app.selectedShape ? app.selectedShape.type : null;
		updateSettingsVisibility(toolName, shapeType);
	}

	render();
	generateCode();
	if (app.selectedShapes.length > 0 || isGlobal) {
		pushState();
	}
	saveToLocalStorage();
}

function updateSettingsVisibility(toolName, shapeType = null) {
	const config = TOOL_CONFIG[toolName];
	if (!config) return;

	let allowed = config.allow || [];
	
	if (toolName === 'select') {
		if (shapeType) {
			const shapeConfig = TOOL_CONFIG[shapeType];
			if (shapeConfig && shapeConfig.allow) {
				allowed = shapeConfig.allow;
			}
		} else {
			allowed = [];
		}
	}

	const currentStyle = app.selectedShape ? app.selectedShape.style : app.drawingStyle;
	const arrowEnabled = currentStyle.arrow && currentStyle.arrow !== 'none';
	const roundedEnabled = currentStyle.freehandMode === 'rounded';
	
	let hasVisibleSettings = false;

	for (const key in SETTINGS_CONFIG) {
		const wrapper = document.getElementById(`wrapper-${key}`);
		if (wrapper) {
			let isVisible = allowed.includes(key);

			if ((key === 'arrowHead' || key === 'arrowScale') && !arrowEnabled) {
				isVisible = false;
			}
			
			if (key === 'cornerRadius' && !roundedEnabled) {
				isVisible = false;
			}

			if (isVisible) {
				wrapper.style.display = 'block';
				wrapper.parentElement.style.display = 'flex';
				if (wrapper.parentElement.classList.contains('control-group-wrapper')) {
					wrapper.parentElement.style.display = 'block';
				}
				hasVisibleSettings = true;
			} else {
				wrapper.style.display = 'none';
				const parent = wrapper.parentElement;
				const hasVisibleChildren = Array.from(parent.children).some(c => c.style.display !== 'none');
				if (!hasVisibleChildren) {
					parent.style.display = 'none';
				}
			}
		}
	}

	const settingsWrapper = document.getElementById('settings-wrapper');
	if (settingsWrapper) {
		settingsWrapper.style.display = hasVisibleSettings ? 'block' : 'none';
	}
}

function updateUIFromShape(s) {
	const geoSection = document.getElementById('geometry-section');
	const geoGroup = geoSection ? geoSection.parentElement : null;

	if (!s) {
		if (geoGroup) geoGroup.style.display = 'none';
		return;
	}
	
	if (geoGroup) geoGroup.style.display = 'flex';
	createGeometryUI(s);

	const style = s.style;
	const fields = [
		'strokeColor', 'lineWidth', 'lineStyle', 'arrowStyle', 'arrowHead', 'arrowScale',
		'opacity', 'textString', 'textSize', 'textFont', 'textWeight', 'textSlant', 
		'textRotate', 'textAnchor', 'textAlign', 'textWidth', 'gridStep',
		'polySides', 'starPoints', 'starRatio', 'simplifyTolerance', 'freehandMode', 'cornerRadius'
	];
	
	fields.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			const config = SETTINGS_CONFIG[id];
			const prop = config ? (config.propName || id) : id;
			if (style[prop] !== undefined) {
				el.value = style[prop];
				if (config && config.type === 'range') {
					const valueSpan = document.getElementById(`${id}Value`);
					if (valueSpan) {
						const unit = config.unit || '';
						if (id === 'textWidth' && style[prop] === 0) {
							valueSpan.textContent = 'Auto';
						} else {
							valueSpan.textContent = id === 'opacity' ? `${Math.round(style[prop] * 100)}%` : `${style[prop]}${unit}`;
						}
					}
				}
			}
		}
	});

	const checkboxes = ['hasFill', 'doubleLine', 'isClosed'];
	checkboxes.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			if (id === 'hasFill') el.checked = !!style.fill;
			else if (id === 'doubleLine') el.checked = !!style.double;
			else if (id === 'isClosed') el.checked = !!style.isClosed;
		}
	});
	
	const fillColorInput = document.getElementById('fillColor');
	if (fillColorInput) {
		fillColorInput.value = style.fill || SETTINGS_CONFIG.fillColor.defaultValue;
		fillColorInput.style.opacity = style.fill ? '1' : '0.2';
		fillColorInput.style.pointerEvents = style.fill ? 'auto' : 'none';
		fillColorInput.disabled = !style.fill;
	}

	updateSettingsVisibility('select', s.type);
}

function updateUIFromDrawingStyle() {
	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const prop = config.propName || key;
		const val = app.drawingStyle[prop];
		const el = document.getElementById(key);
		
		if (el && val !== undefined) {
			if (config.type === 'checkbox') {
				el.checked = val;
			} else if (config.type === 'color-checkbox') {
				const hasFillCheck = document.getElementById('hasFill');
				const isEnabled = app.drawingStyle.fill !== null;
				if (hasFillCheck) hasFillCheck.checked = isEnabled;
				el.value = app.drawingStyle.fill || config.defaultValue;
				el.style.opacity = isEnabled ? '1' : '0.2';
				el.style.pointerEvents = isEnabled ? 'auto' : 'none';
				el.disabled = !isEnabled;
			} else {
				el.value = val;
			}
			
			if (config.type === 'range') {
				const span = document.getElementById(`${key}Value`);
				if (span) {
					const unit = config.unit || '';
					if (key === 'textWidth' && val === 0) {
						span.textContent = 'Auto';
					} else {
						span.textContent = key === 'opacity' ? `${Math.round(val * 100)}%` : `${val}${unit}`;
					}
				}
			}
		}
	}
}

function updateUIFromGlobalSettings() {
	for (const key in GLOBAL_SETTINGS_CONFIG) {
		const config = GLOBAL_SETTINGS_CONFIG[key];
		const el = document.getElementById(key);
		if (el) {
			const val = app.drawingStyle[key] !== undefined ? app.drawingStyle[key] : config.defaultValue;
			
			if (config.type === 'checkbox') {
				el.checked = val;
			} else {
				el.value = val;
			}
			
			if (config.type === 'range') {
				const span = document.getElementById(`${key}Value`);
				if (span) span.textContent = `${val}${config.unit || ''}`;
			}
			if (key === 'canvasZoom') canvas.parentElement.style.setProperty('--grid-size', `${val}px`);
			if (key === 'stageColor') canvas.parentElement.style.backgroundColor = val;
		}
	}
}

function generateCode() {
	let out = "";
	const style = app.drawingStyle;
	const usePreamble = style.genPreamble;
	const docClass = style.docClass || 'standalone';
	const useFigure = (style.figCaption || style.figLabel) && docClass !== 'standalone';
	
	const packages = new Set(['tikz']);
	const libraries = new Set();
	
	const hasCircuits = app.shapes.some(s => ['resistor', 'capacitor', 'inductor', 'diode', 'source_dc', 'source_ac', 'lamp', 'switch', 'ground'].includes(s.type));
	if (hasCircuits) packages.add('circuitikz');

	const hasGeometric = app.shapes.some(s => ['star', 'diamond', 'ellipse', 'polygon', 'flow_decision'].includes(s.type));
	if (hasGeometric) libraries.add('shapes.geometric');

	const hasArrows = app.shapes.some(s => s.style.arrow && s.style.arrow !== 'none');
	if (hasArrows || style.globalArrow) libraries.add('arrows.meta');

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
		
		if (libraries.size > 0) {
			out += `\\usetikzlibrary{${Array.from(libraries).join(', ')}}\n`;
		}
		out += "\n\\begin{document}\n\n";
	} else {
		out += `% Required packages:\n`;
		packages.forEach(p => out += `\\usepackage{${p}}\n`);
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
		if (s.style.fill && s.style.fill !== '#ffffff' && s.style.fill !== 'transparent') {
			usedColors.set(s.style.fill.toUpperCase(), true);
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

function saveToLocalStorage() {
	const uiState = [];
	document.querySelectorAll('.panel-group').forEach((group, index) => {
		const header = group.querySelector('.panel-header');
		if (header) {
			uiState.push({
				index: index,
				collapsed: header.classList.contains('collapsed')
			});
		}
	});

	const activeToolId = Object.keys(app.toolManager).find(key => app.toolManager[key] === app.activeTool);
	const selectionIndices = app.selectedShapes.map(selected => app.shapes.indexOf(selected)).filter(i => i !== -1);

	const fullState = {
		shapes: app.shapes,
		selection: selectionIndices,
		history: app.history,
		historyIndex: app.historyIndex,
		drawingStyle: app.drawingStyle,
		activeToolId: activeToolId,
		uiState: uiState
	};
	localStorage.setItem('tikz_generator_data', JSON.stringify(fullState));
}

function loadFromLocalStorage() {
	const data = localStorage.getItem('tikz_generator_data');
	if (!data) return false;

	try {
		const parsed = JSON.parse(data);
		app.history = parsed.history || [];
		app.historyIndex = parsed.historyIndex !== undefined ? parsed.historyIndex : -1;
		
		let maxId = -1;
		const processShapes = (shapes) => {
			return shapes.map(s => {
				if (s.id === undefined) s.id = app.nextShapeId++;
				if (s.id > maxId) maxId = s.id;
				return s;
			});
		};
		
		if (app.historyIndex >= 0 && app.history[app.historyIndex]) {
			const currentHistory = JSON.parse(app.history[app.historyIndex]);
			app.shapes = Array.isArray(currentHistory) ? currentHistory : (currentHistory.shapes || []);
			app.shapes = processShapes(app.shapes);

			app.selectedShapes = [];
			if (!Array.isArray(currentHistory) && currentHistory.selection) {
				currentHistory.selection.forEach(idx => {
					if (app.shapes[idx]) app.selectedShapes.push(app.shapes[idx]);
				});
			}
		} else {
			app.shapes = parsed.shapes || [];
			app.shapes = processShapes(app.shapes);
			app.selectedShapes = [];
			if (parsed.selection) {
				parsed.selection.forEach(idx => {
					if (app.shapes[idx]) app.selectedShapes.push(app.shapes[idx]);
				});
			}
		}
		
		app.nextShapeId = maxId + 1;

		app.selectedShape = app.selectedShapes.length > 0 ? app.selectedShapes[0] : null;

		app.drawingStyle = { ...app.drawingStyle, ...parsed.drawingStyle };

		if (parsed.uiState) {
			const groups = document.querySelectorAll('.panel-group');
			parsed.uiState.forEach(ui => {
				if (groups[ui.index]) {
					const header = groups[ui.index].querySelector('.panel-header');
					const body = groups[ui.index].querySelector('.panel-body');
					const icon = header ? header.querySelector('.toggle-icon') : null;

					if (header && body) {
						header.classList.toggle('collapsed', ui.collapsed);
						body.style.display = ui.collapsed ? 'none' : 'block';
						if (icon) {
							icon.style.transform = ui.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
						}
					}
				}
			});
		}

		updateUIFromGlobalSettings();
		updateUIFromDrawingStyle();
		updateUIFromShape(app.selectedShape);
		
		const savedToolId = parsed.activeToolId;
		if (savedToolId && app.toolManager[savedToolId]) {
			setTool(savedToolId);
		} else {
			setTool('select');
		}

		render();
		generateCode();
		updateUndoRedoUI();
		return true;
	} catch (e) {
		console.error(e);
		return false;
	}
}

function init() {
	createToolsUI();
	createGlobalSettingsUI();
	createSettingsUI();
	setupCollapsibles();
	setupTabs();
	setupTextEditing();
	/* Cette fonctionnalité ne fonctionne pas et activée, cause beaucoup de lag
	Il faut la laisser désactivée
	setupOutputInteraction();  */
	
	document.getElementById('global-settings-container').addEventListener('input', (e) => {
		if (e.target.dataset.global) {
			updateSetting(e.target);
		}
	});

	document.getElementById('settings-container').addEventListener('input', (e) => {
		if (e.target.dataset.setting) {
			updateSetting(e.target);
		}
	});
	
	document.getElementById('alignLeft').addEventListener('click', () => alignSelected('left'));
	document.getElementById('alignCenter').addEventListener('click', () => alignSelected('center'));
	document.getElementById('alignRight').addEventListener('click', () => alignSelected('right'));
	document.getElementById('alignTop').addEventListener('click', () => alignSelected('top'));
	document.getElementById('alignMiddle').addEventListener('click', () => alignSelected('middle'));
	document.getElementById('alignBottom').addEventListener('click', () => alignSelected('bottom'));
	document.getElementById('matchWidth').addEventListener('click', () => matchSize('width'));
	document.getElementById('matchHeight').addEventListener('click', () => matchSize('height'));
	document.getElementById('rotateCCW').addEventListener('click', () => rotateSelected(-90));
	document.getElementById('rotateCW').addEventListener('click', () => rotateSelected(90));
	document.getElementById('distH').addEventListener('click', () => distributeSelected('h'));
	document.getElementById('distV').addEventListener('click', () => distributeSelected('v'));

	const defaultGlobalState = {};
	for (const key in GLOBAL_SETTINGS_CONFIG) {
		defaultGlobalState[key] = GLOBAL_SETTINGS_CONFIG[key].defaultValue;
	}

	app.drawingStyle = { ...generateInitialState(), ...defaultGlobalState };
	
	const toolHandlers = { DrawingTool, SelectTool, DuplicateTool, DeleteTool, RaiseTool, LowerTool, EyedropperTool };
	app.toolManager = {};
	for (const toolName in TOOL_CONFIG) {
		const config = TOOL_CONFIG[toolName];
		const HandlerClass = toolHandlers[config.handler];
		if (HandlerClass) {
			if (config.handler === 'DrawingTool') {
				app.toolManager[toolName] = new HandlerClass(toolName);
			} else {
				app.toolManager[toolName] = new HandlerClass();
			}
		}
	}

	document.getElementById('undoBtn').addEventListener('click', undo);
	document.getElementById('redoBtn').addEventListener('click', redo);
	document.getElementById('clearBtn').addEventListener('click', clearAll);
	document.getElementById('copyBtn').addEventListener('click', copyToClipboard);

	canvas.addEventListener('mousedown', onMouseDown);
	canvas.addEventListener('mousemove', onMouseMove);
	canvas.addEventListener('mouseup', onMouseUp);
	canvas.addEventListener('mouseleave', onMouseUp);
	canvas.addEventListener('contextmenu', e => e.preventDefault());
	window.addEventListener('resize', resizeCanvas);
	
	canvas.addEventListener('wheel', (e) => {
		e.preventDefault();
		const zoomSensitivity = 0.001;
		const delta = -e.deltaY * zoomSensitivity;
		const oldScale = app.view.scale;
		let newScale = oldScale + delta * oldScale;
		
		newScale = Math.max(UI_CONSTANTS.MIN_ZOOM, Math.min(UI_CONSTANTS.MAX_ZOOM, newScale));
		
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		
		const worldX = (mouseX - app.view.x) / oldScale;
		const worldY = (mouseY - app.view.y) / oldScale;
		
		app.view.x = mouseX - worldX * newScale;
		app.view.y = mouseY - worldY * newScale;
		app.view.scale = newScale;
		
		const zoomSlider = document.getElementById('canvasZoom');
		if(zoomSlider) {
			zoomSlider.value = newScale * 100;
			const valSpan = document.getElementById('canvasZoomValue');
			if(valSpan) valSpan.textContent = `${Math.round(newScale * 100)}%`;
		}
		
		render();
	}, { passive: false });
	
	resizeCanvas();

	const loaded = loadFromLocalStorage();
	if (!loaded) {
		setTool('select');
		if (app.history.length === 0) pushState();
		render();
		generateCode();
	} else {
		updateUIFromGlobalSettings();
	}
	
	setupKeyboardShortcuts();
	
	updateUIFromShape(app.selectedShape);
}

document.addEventListener('DOMContentLoaded', init);