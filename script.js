const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');
const coordsDisplay = document.getElementById('coords');

const settings = {
    strokeColor: document.getElementById('strokeColor'),
    fillColor: document.getElementById('fillColor'),
    hasFill: document.getElementById('hasFill'),
    lineWidth: document.getElementById('lineWidth'),
    lineStyle: document.getElementById('lineStyle'),
    arrowStyle: document.getElementById('arrowStyle'),
    opacity: document.getElementById('opacity'),
    widthValue: document.getElementById('widthValue'),
    opacityValue: document.getElementById('opacityValue')
};

let shapes = [];
let history = [];
let isDrawing = false;
let startX = 0, startY = 0;
let currentTool = 'line';
let currentShape = null;
let selectedShape = null;
let isMoving = false;
let isResizing = false;
let resizeHandle = null;
let dragOffsetX = 0, dragOffsetY = 0;

const ShapeTools = {
	line: {
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y1);
			ctx.lineTo(s.x2, s.y2);
			ctx.stroke();
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1), y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2), y2 = toTikZ(s.y2, true);
			return `(${x1},${y1}) -- (${x2},${y2});`;
		}
	},
	rect: {
		render: (s, ctx) => {
			if (s.style.fill) ctx.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
			ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1), y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2), y2 = toTikZ(s.y2, true);
			return `(${x1},${y1}) rectangle (${x2},${y2});`;
		}
	},
	circle: {
		render: (s, ctx) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const r = toTikZ(Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2)));
			const x1 = toTikZ(s.x1), y1 = toTikZ(s.y1, true);
			return `(${x1},${y1}) circle (${r});`;
		}
	},
	ellipse: {
		render: (s, ctx) => {
			const w = s.x2 - s.x1;
			const h = s.y2 - s.y1;
			const cx = s.x1 + w / 2;
			const cy = s.y1 + h / 2;
			ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const cx = toTikZ(s.x1 + (s.x2 - s.x1) / 2);
			const cy = toTikZ(s.y1 + (s.y2 - s.y1) / 2, true);
			const rx = toTikZ(Math.abs(s.x2 - s.x1) / 2);
			const ry = toTikZ(Math.abs(s.y2 - s.y1) / 2);
			return `(${cx},${cy}) ellipse (${rx} and ${ry});`;
		}
	},
	triangle: {
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y2);
			ctx.lineTo(s.x2, s.y2);
			ctx.lineTo((s.x1 + s.x2) / 2, s.y1);
			ctx.closePath();
			if (s.style.fill) ctx.fill();
			ctx.stroke();
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1), y1_tikz = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2), y2_tikz = toTikZ(s.y2, true);
			const cx = toTikZ((s.x1 + s.x2) / 2);
			return `(${x1},${y2_tikz}) -- (${x2},${y2_tikz}) -- (${cx},${y1_tikz}) -- cycle;`;
		}
	},
	grid: {
		render: (s, ctx) => {
			ctx.save();
			ctx.beginPath();
			ctx.strokeStyle = '#cccccc';
			ctx.lineWidth = 1;
			ctx.setLineDash([]);
			const left = Math.min(s.x1, s.x2);
			const right = Math.max(s.x1, s.x2);
			const top = Math.min(s.y1, s.y2);
			const bottom = Math.max(s.y1, s.y2);
			for (let x = left; x <= right; x += GRID_SIZE) {
				ctx.moveTo(x, top); ctx.lineTo(x, bottom);
			}
			for (let y = top; y <= bottom; y += GRID_SIZE) {
				ctx.moveTo(left, y); ctx.lineTo(right, y);
			}
			ctx.stroke();
			ctx.restore();
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1), y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2), y2 = toTikZ(s.y2, true);
			return `[step=0.5,gray!50,very thin] (${x1},${y1}) grid (${x2},${y2});`;
		}
	},
	axes: {
		render: (s, ctx) => {
			ctx.save();
			ctx.beginPath();
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 1;
			ctx.setLineDash([]);
			ctx.moveTo(s.x1, s.y2); ctx.lineTo(s.x2, s.y2);
			ctx.moveTo(s.x1, s.y2); ctx.lineTo(s.x1, s.y1);
			ctx.stroke();
			drawArrow(ctx, s.x2, s.y2, 0, '->', 2);
			drawArrow(ctx, s.x1, s.y1, -Math.PI / 2, '->', 2);
			ctx.restore();
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1), y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2), y2 = toTikZ(s.y2, true);
			return `[->] (${x1},${y2}) -- (${x2},${y2}) node[right] {$x$};\n  \\draw[->] (${x1},${y2}) -- (${x1},${y1}) node[above] {$y$};`;
		}
	},
	arc: {
		render: (s, ctx) => {
			const r = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
			const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
			ctx.arc(s.x1, s.y1, r, 0, ang, (s.y2 - s.y1) < 0);
			ctx.stroke();
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1), y1 = toTikZ(s.y1, true);
			const r = toTikZ(Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2)));
			let endDeg = Math.round(Math.atan2(-(s.y2 - s.y1), s.x2 - s.x1) * 180 / Math.PI);
			return `(${x1},${y1}) arc (0:${endDeg}:${r});`;
		}
	},
	curve: {
		create: (x, y, style) => ({
			type: 'curve', x1: x, y1: y, x2: x, y2: y,
			cp1x: x, cp1y: y, cp2x: x, cp2y: y,
			style: { ...style }
		}),
		onDrag: (s, x, y) => {
			s.x2 = x;
			s.y2 = y;
			s.cp1x = s.x1 + (x - s.x1) * 0.25;
			s.cp1y = y;
			s.cp2x = s.x1 + (x - s.x1) * 0.75;
			s.cp2y = s.y1;
		},
		render: (s, ctx) => {
			ctx.moveTo(s.x1, s.y1);
			ctx.bezierCurveTo(s.cp1x, s.cp1y, s.cp2x, s.cp2y, s.x2, s.y2);
			ctx.stroke();
		},
		toTikZ: (s) => {
			const x1 = toTikZ(s.x1), y1 = toTikZ(s.y1, true);
			const x2 = toTikZ(s.x2), y2 = toTikZ(s.y2, true);
			const cp1x = toTikZ(s.cp1x), cp1y = toTikZ(s.cp1y, true);
			const cp2x = toTikZ(s.cp2x), cp2y = toTikZ(s.cp2y, true);
			return `(${x1},${y1}) .. controls (${cp1x},${cp1y}) and (${cp2x},${cp2y}) .. (${x2},${y2});`;
		},
		drawHandles: (s, ctx) => {
			ctx.beginPath();
			ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.cp1x, s.cp1y);
			ctx.moveTo(s.x2, s.y2); ctx.lineTo(s.cp2x, s.cp2y);
			ctx.strokeStyle = '#ff9500';
			ctx.stroke();
			[{ x: s.cp1x, y: s.cp1y }, { x: s.cp2x, y: s.cp2y }].forEach(p => {
				ctx.fillStyle = 'white';
				ctx.strokeStyle = '#ff9500';
				ctx.beginPath();
				ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
			});
		}
	}
};

const SCALE = 40;
const GRID_SIZE = 20;

let currentState = {
	stroke: '#2c2c2c',
	fill: null,
	width: 1,
	dash: 'solid',
	arrow: 'none',
	opacity: 1
};

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    if (history.length === 0) {
        pushState();
    }
    render();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    selectedShape = null;
    isDrawing = false;
    isMoving = false;
    isResizing = false;
    canvas.style.cursor = 'crosshair';
    render();
}

function updateSettings() {
    const newStyle = {
        stroke: settings.strokeColor.value,
        fill: settings.hasFill.checked ? settings.fillColor.value : null,
        width: parseFloat(settings.lineWidth.value),
        dash: settings.lineStyle.value,
        arrow: settings.arrowStyle.value,
        opacity: parseFloat(settings.opacity.value)
    };

    if (selectedShape) {
        selectedShape.style = { ...selectedShape.style, ...newStyle };
        render();
        generateCode();
        pushState();
    } else {
        currentState = { ...currentState, ...newStyle };
    }

    settings.widthValue.textContent = newStyle.width + 'pt';
    settings.opacityValue.textContent = Math.round(newStyle.opacity * 100) + '%';
    document.getElementById('fillColor').disabled = !settings.hasFill.checked;
}

function snap(val) {
	return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function getPos(e) {
	const rect = canvas.getBoundingClientRect();
	let x = e.clientX - rect.left;
	let y = e.clientY - rect.top;
	if (!e.shiftKey) {
		x = snap(x);
		y = snap(y);
	}
	return { x, y };
}

function toTikZ(val, isY = false) {
	let res = val / SCALE;
	if (isY) res = (canvas.height - val) / SCALE;
	return parseFloat(res.toFixed(2));
}

function drawArrow(ctx, x, y, angle, style, size) {
	if (style === 'none') return;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.beginPath();
	const s = size * 5;
	
	if (style.includes('stealth')) {
		ctx.moveTo(-s, -s/2.5); ctx.lineTo(0, 0); ctx.lineTo(-s, s/2.5);
		ctx.fillStyle = ctx.strokeStyle; ctx.fill();
	} else if (style.includes('latex')) {
		ctx.moveTo(-s, 0); ctx.lineTo(-s*0.85, -s/3); 
		ctx.lineTo(0, 0); ctx.lineTo(-s*0.85, s/3); ctx.lineTo(-s, 0);
		ctx.fillStyle = ctx.strokeStyle; ctx.fill();
	} else {
		ctx.moveTo(-s, -s/2); ctx.lineTo(0, 0); ctx.lineTo(-s, s/2);
		ctx.stroke();
	}
	ctx.restore();
}

function renderShape(s, ctx) {
    ctx.save();
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
    
    const tool = ShapeTools[s.type];
    if (tool && tool.render) {
		if (s.type === 'grid' || s.type === 'axes') {
			tool.render(s, ctx);
		} else {
			tool.render(s, ctx);
		}
    }

    if (s.style.arrow !== 'none' && (s.type === 'line' || s.type === 'curve' || s.type === 'arc')) {
        ctx.setLineDash([]);
        let angEnd, angStart;
        const w = s.x2 - s.x1;
        const h = s.y2 - s.y1;
        
        if (s.type === 'curve') {
            angEnd = Math.atan2(s.y2 - s.cp2y, s.x2 - s.cp2x);
            angStart = Math.atan2(s.cp1y - s.y1, s.cp1x - s.x1) + Math.PI;
        } else if (s.type === 'arc') {
             const r = Math.sqrt(w*w + h*h);
             const ang = Math.atan2(h, w);
             const endX = s.x1 + r * Math.cos(ang);
             const endY = s.y1 + r * Math.sin(ang);
             const endAngle = h < 0 ? ang + Math.PI/2 : ang - Math.PI/2;
             
             if (s.style.arrow.includes('>') || s.style.arrow.includes('stealth') || s.style.arrow.includes('latex')) {
                drawArrow(ctx, endX, endY, endAngle + Math.PI, s.style.arrow, s.style.width);
             }
             if (s.style.arrow.includes('<')) {
                 drawArrow(ctx, s.x1 + r, s.y1, Math.PI / 2, s.style.arrow, s.style.width);
             }
             ctx.restore();
             return;
        } else { 
            angEnd = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
            angStart = angEnd + Math.PI;
        }

        if (s.style.arrow.includes('>') || s.style.arrow.includes('stealth') || s.style.arrow.includes('latex')) {
            drawArrow(ctx, s.x2, s.y2, angEnd, s.style.arrow, s.style.width);
        }
        if (s.style.arrow.includes('<')) {
            drawArrow(ctx, s.x1, s.y1, angStart, s.style.arrow, s.style.width);
        }
    }

    ctx.restore();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach(s => renderShape(s, ctx));
    if (isDrawing && currentShape) renderShape(currentShape, ctx);
    if (selectedShape) drawSelection(selectedShape, ctx);
}

function generateCode() {
    let out = "\\begin{tikzpicture}\n";
    let colors = new Map();
    let cIdx = 1;

    shapes.forEach(s => {
        if (s.style.stroke !== '#2c2c2c' && !colors.has(s.style.stroke)) colors.set(s.style.stroke, 'c' + cIdx++);
        if (s.style.fill && !colors.has(s.style.fill)) colors.set(s.style.fill, 'c' + cIdx++);
    });

    colors.forEach((name, hex) => {
        out += `  \\definecolor{${name}}{HTML}{${hex.substring(1).toUpperCase()}}\n`;
    });
    if (colors.size) out += "\n";

    shapes.forEach(s => {
        const tool = ShapeTools[s.type];
        if (!tool || !tool.toTikZ) return;

        let opts = [];
        if (s.style.stroke !== '#2c2c2c') opts.push(`draw=${colors.get(s.style.stroke)}`);
        if (s.style.fill) opts.push(`fill=${colors.get(s.style.fill)}`);
        if (s.style.width !== 1) opts.push(`line width=${s.style.width}pt`);
        if (s.style.dash !== 'solid') opts.push(s.style.dash);
        if (s.style.opacity < 1) opts.push(`opacity=${s.style.opacity}`);
        
        if (s.type === 'grid') {
            out += `  \\draw${opts.length ? `[${opts.join(', ')}]` : ''} ${tool.toTikZ(s)}\n`;
            return;
        }
        
        if (s.type === 'axes') {
            out += `  \\draw ${tool.toTikZ(s)}\n`;
            return;
        }
        
        if (s.style.arrow !== 'none' && !['rect','circle','ellipse','grid','axes','triangle'].includes(s.type)) {
            opts.push(s.style.arrow);
        }

        const optStr = opts.length ? `[${opts.join(', ')}]` : '';
        out += `  \\draw${optStr} ${tool.toTikZ(s)}\n`;
    });

    out += "\\end{tikzpicture}";
    output.value = out;
}

canvas.addEventListener('mousedown', e => {
    const p = getPos(e);
    startX = p.x;
    startY = p.y;

    if (currentTool === 'select') {
        if (selectedShape) {
            const handles = getHandles(selectedShape);
            for (let i = 0; i < handles.length; i++) {
                const h = handles[i];
                if (Math.abs(p.x - h.x) < 6 && Math.abs(p.y - h.y) < 6) {
                    isResizing = true;
                    resizeHandle = h.pos;
                    document.body.style.cursor = h.cursor;
                    return;
                }
            }
        }
        
        const shape = getShapeAtPos(p.x, p.y);
        selectedShape = shape;
        if (shape) {
            isMoving = true;
            dragOffsetX = p.x - shape.x1;
            dragOffsetY = p.y - shape.y1;
            updateUIFromShape(shape);
        }
        render();

    } else {
        isDrawing = true;
        selectedShape = null;
        
        const tool = ShapeTools[currentTool];
        if (tool && tool.create) {
            currentShape = tool.create(startX, startY, currentState);
        } else {
            currentShape = {
                type: currentTool,
                x1: startX, y1: startY, x2: startX, y2: startY,
                style: { ...currentState }
            };
        }
    }
});

canvas.addEventListener('mousemove', e => {
    const p = getPos(e);
    coordsDisplay.textContent = `x: ${toTikZ(p.x)}, y: ${toTikZ(p.y, true)}`;

    if (currentTool === 'select' && !isResizing) {
        let cursor = 'default';
        if (selectedShape) {
            const handles = getHandles(selectedShape);
             for (let i = 0; i < handles.length; i++) {
                const h = handles[i];
                if (Math.abs(p.x - h.x) < 6 && Math.abs(p.y - h.y) < 6) {
                    cursor = h.cursor;
                    break;
                }
            }
        }
        if (cursor === 'default' && getShapeAtPos(p.x, p.y)) {
             cursor = 'move';
        }
        canvas.style.cursor = cursor;
    }

    if (isDrawing && currentShape) {
        const tool = ShapeTools[currentTool];
        if (tool && tool.onDrag) {
            tool.onDrag(currentShape, p.x, p.y);
        } else {
            currentShape.x2 = p.x;
            currentShape.y2 = p.y;
        }
        render();
    } else if (isMoving && selectedShape) {
        const dx = (p.x - dragOffsetX) - selectedShape.x1;
        const dy = (p.y - dragOffsetY) - selectedShape.y1;
        moveShape(selectedShape, dx, dy);
        render();
    } else if (isResizing && selectedShape) {
        resizeShape(selectedShape, p.x, p.y, resizeHandle);
        render();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing && currentShape) {
        if (Math.abs(startX - currentShape.x2) > 2 || Math.abs(startY - currentShape.y2) > 2) {
            shapes.push(currentShape);
            pushState();
            generateCode();
        }
    }
    
    if(isMoving || isResizing) {
        generateCode();
        pushState();
    }
    
    isDrawing = false;
    isMoving = false;
    isResizing = false;
    resizeHandle = null;
    currentShape = null;
    document.body.style.cursor = 'default';
    if (currentTool === 'select') {
        canvas.style.cursor = 'default';
    } else {
        canvas.style.cursor = 'crosshair';
    }
    render();
});

canvas.addEventListener('mousemove', e => {
	const p = getPos(e);
	coordsDisplay.textContent = `x: ${toTikZ(p.x)}, y: ${toTikZ(p.y, true)}`;
	
	if (!isDrawing) return;
	currentShape.x2 = p.x;
	currentShape.y2 = p.y;
	render();
});

canvas.addEventListener('mouseup', () => {
	if (!isDrawing) return;
	isDrawing = false;
	if (Math.abs(startX - currentShape.x2) > 2 || Math.abs(startY - currentShape.y2) > 2) {
		shapes.push(currentShape);
		generateCode();
	}
	currentShape = null;
	render();
});

function undo() {
    if (history.length > 1) {
        history.pop();
        shapes = JSON.parse(history[history.length - 1]);
        selectedShape = null;
        render();
        generateCode();
    }
}

function clearAll() {
    shapes = [];
    selectedShape = null;
    pushState();
    render();
    generateCode();
}

function pushState() {
    history.push(JSON.stringify(shapes));
}

function getShapeAtPos(x, y) {
    for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        const minX = Math.min(s.x1, s.x2) - s.style.width;
        const maxX = Math.max(s.x1, s.x2) + s.style.width;
        const minY = Math.min(s.y1, s.y2) - s.style.width;
        const maxY = Math.max(s.y1, s.y2) + s.style.width;
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            return s;
        }
    }
    return null;
}

function updateUIFromShape(s) {
    if (!s) return;
    settings.strokeColor.value = s.style.stroke;
    settings.hasFill.checked = !!s.style.fill;
    settings.fillColor.value = s.style.fill || '#e0dcd3';
    settings.fillColor.disabled = !s.style.fill;
    settings.lineWidth.value = s.style.width;
    settings.lineStyle.value = s.style.dash;
    settings.arrowStyle.value = s.style.arrow;
    settings.opacity.value = s.style.opacity;

    settings.widthValue.textContent = s.style.width + 'pt';
    settings.opacityValue.textContent = Math.round(s.style.opacity * 100) + '%';
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
        { x: cx,   y: minY, pos: 'tm', cursor: 'ns-resize' },
        { x: maxX, y: minY, pos: 'tr', cursor: 'nesw-resize' },
        { x: maxX, y: cy,   pos: 'mr', cursor: 'ew-resize' },
        { x: maxX, y: maxY, pos: 'br', cursor: 'nwse-resize' },
        { x: cx,   y: maxY, pos: 'bm', cursor: 'ns-resize' },
        { x: minX, y: maxY, pos: 'bl', cursor: 'nesw-resize' },
        { x: minX, y: cy,   pos: 'ml', cursor: 'ew-resize' },
    ];
}

function drawSelection(s, ctx) {
    const minX = Math.min(s.x1, s.x2);
    const maxX = Math.max(s.x1, s.x2);
    const minY = Math.min(s.y1, s.y2);
    const maxY = Math.max(s.y1, s.y2);

    ctx.save();
    ctx.strokeStyle = '#007aff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);
    
    const handles = getHandles(s);
    handles.forEach(h => {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 1;
        ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
        ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
    });

    const tool = ShapeTools[s.type];
    if (tool && tool.drawHandles) {
        tool.drawHandles(s, ctx);
    }

    ctx.restore();
}

function moveShape(s, dx, dy) {
    s.x1 += dx; s.y1 += dy;
    s.x2 += dx; s.y2 += dy;
    if (s.type === 'curve') {
        s.cp1x += dx; s.cp1y += dy;
        s.cp2x += dx; s.cp2y += dy;
    }
}

function resizeShape(s, mx, my, handle) {
    if (handle.includes('l')) s.x1 = mx;
    if (handle.includes('r')) s.x2 = mx;
    if (handle.includes('t')) s.y1 = my;
    if (handle.includes('b')) s.y2 = my;
}

function copyToClipboard() {
	output.select();
	document.execCommand('copy');
}