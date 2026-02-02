import { TOOL_CONFIG, SETTINGS_CONFIG, GLOBAL_SETTINGS_CONFIG, UI_CONSTANTS } from './config.js';
import { app, pushState, saveToLocalStorage } from './state.js';
import { render } from './renderer.js';
import { generateCode } from './latexGenerator.js';
import { toTikZ, tikzToPx, worldToScreen, getPos } from './utils.js';
import { ShapeManager, getShapeAtPos } from './shapes.js';
import { alignSelected, distributeSelected, matchSize, rotateSelected } from './state.js';
import { EyedropperTool } from './tools.js';
import { translate, LANGUAGES, setLanguage, getLanguage } from './i18n.js';

// Références DOM exportées
export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');
export const output = document.getElementById('output');
export const coordsDisplay = document.getElementById('coords');

export function createToolsUI() {
	const containers = {
		general: document.getElementById('tools-general'),
		drawing: document.getElementById('tools-drawing'),
		circuits: document.getElementById('tools-circuits'),
		optics: document.getElementById('tools-optics'),
		logic: document.getElementById('tools-logic'),
		flowchart: document.getElementById('tools-flowchart'),
		pseudo3d: document.getElementById('tools-pseudo3d'),
		physics: document.getElementById('tools-physics')
	};

	Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

	const toolDescriptions = {
		select: 'Sélectionner et modifier',
		duplicate: 'Dupliquer des formes',
		delete: 'Supprimer des formes',
		raise: 'Élever vers l\'avant',
		lower: 'Abaisser vers l\'arrière',
		eyedropper: 'Prélever couleur',
		painter: 'Peindre styles',
		point: 'Point unique',
		text: 'Texte et formules',
		freehand: 'Tracé libre',
		line: 'Ligne droite',
		rect: 'Rectangle',
		circle: 'Cercle',
		ellipse: 'Ellipse',
		triangle: 'Triangle',
		diamond: 'Losange',
		grid: 'Grille régulière',
		axes: 'Axes cartésiens',
		arc: 'Arc de cercle',
		curve: 'Courbe Bézier',
		wave: 'Onde sinusoïdale',
		polygon: 'Polygone',
		star: 'Étoile',
		plot: 'Fonction graphique',
		resistor: 'Résistance',
		capacitor: 'Condensateur',
		inductor: 'Inductance',
		diode: 'Diode',
		source_dc: 'Source CC',
		source_ac: 'Source CA',
		battery: 'Batterie',
		lamp: 'Ampoule',
		switch: 'Interrupteur',
		ground: 'Masse',
		ammeter: 'Ampèremètre',
		voltmeter: 'Voltmètre',
		transistor_npn: 'Transistor NPN',
		potentiometer: 'Potentiomètre',
		lens_convex: 'Lentille convergente',
		lens_concave: 'Lentille divergente',
		mirror: 'Miroir plan',
		logic_and: 'Porte ET',
		logic_or: 'Porte OU',
		logic_not: 'Porte NON',
		logic_nand: 'Porte NAND',
		logic_nor: 'Porte NOR',
		logic_xor: 'Porte XOR',
		logic_xnor: 'Porte XNOR',
		flow_start: 'Début/Fin',
		flow_process: 'Processus',
		flow_decision: 'Décision',
		spring: 'Ressort',
		mass: 'Masse',
		pulley: 'Poulie',
		piston: 'Piston',
		field_mark: 'Marque de champ',
		wedge: 'Coin',
		support: 'Support',
		damper: 'Amortisseur',
		pendulum: 'Pendule',
		repere_cartesian: 'Repère 3D',
		cube: 'Cube',
		cylinder_3d: 'Cylindre',
		sphere_3d: 'Sphère',
		pyramid_3d: 'Pyramide',
		cone_3d: 'Cône',
		prism_3d: 'Prisme',
		plane_3d: 'Plan'
	};

	for (const toolId in TOOL_CONFIG) {
		const config = TOOL_CONFIG[toolId];
		const wrapper = document.createElement('div');
		wrapper.className = 'tool-item-wrapper';
		wrapper.dataset.tool = toolId;

		const button = document.createElement('button');
		button.className = 'tool-btn';
		button.dataset.tool = toolId;
		button.title = translate(toolId);
		
		button.innerHTML = `${config.icon}`;

		const label = document.createElement('span');
		label.className = 'tool-btn-label';
		label.textContent = translate(toolId);

		button.appendChild(label);

		const description = document.createElement('div');
		description.className = 'tool-btn-description';
		description.textContent = toolDescriptions[toolId] || translate(toolId);

		button.addEventListener('click', () => setTool(toolId));

		wrapper.appendChild(button);
		wrapper.appendChild(description);

		const targetContainer = containers[config.group] || containers.drawing;
		if (targetContainer) {
			targetContainer.appendChild(wrapper);
		}
	}

	setupShapesSearch();
}

export function createSettingsUI() {
	const container = document.getElementById('settings-container');
	container.innerHTML = '';
	
	const resetBtnContainer = document.createElement('div');
	resetBtnContainer.className = 'control-group-wrapper';
	resetBtnContainer.style.marginBottom = '15px';
	resetBtnContainer.innerHTML = `
		<button id="resetStyleBtn" class="btn btn-secondary btn-full">
			<i class="ti ti-refresh"></i> ${translate('resetStyle')}
		</button>
	`;
	container.appendChild(resetBtnContainer);
	
	const settingsGroups = new Map();

	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const groupName = config.group || `group-${key}`;

		if (!settingsGroups.has(groupName)) {
			settingsGroups.set(groupName, {
				configs: [],
				options: config.groupOptions || {}
			});
		}
		settingsGroups.get(groupName).configs.push({ key, ...config });
	}

	settingsGroups.forEach((groupInfo) => {
		const groupContainer = document.createElement('div');
		if (groupInfo.options.type === 'row') {
			groupContainer.className = 'control-row';
		} else {
			groupContainer.className = 'control-group-wrapper';
		}

		groupInfo.configs.forEach(config => {
			const key = config.key;
			const controlWrapper = document.createElement('div');
			controlWrapper.className = 'control-group';
			controlWrapper.id = `wrapper-${key}`;
			
			const label = document.createElement('label');
			label.textContent = translate(key);
			controlWrapper.appendChild(label);

			if (config.type === 'select') {
				const select = createCustomSelect(key, config.options, config.defaultValue, updateSetting, false);
				controlWrapper.appendChild(select);
			} else if (config.type === 'textarea') {
				const el = document.createElement('textarea');
				el.id = key;
				el.dataset.setting = key;
				el.className = 'settings-input';
				el.rows = 2;
				controlWrapper.appendChild(el);
			} else if (config.type === 'text' || config.type === 'number') {
				const el = document.createElement('input');
				el.type = config.type;
				el.id = key;
				el.dataset.setting = key;
				el.className = 'settings-input';
				if (config.step) el.step = config.step;
				controlWrapper.appendChild(el);
			} else if (config.type === 'range') {
				const row = document.createElement('div');
				row.className = 'slider-row';
				const badge = document.createElement('span');
				badge.id = `${key}Value`;
				badge.className = 'value-badge';
				row.appendChild(label);
				row.appendChild(badge);
				controlWrapper.innerHTML = '';
				controlWrapper.appendChild(row);

				const el = document.createElement('input');
				el.type = 'range';
				el.id = key;
				el.dataset.setting = key;
				el.min = config.min;
				el.max = config.max;
				el.step = config.step;
				el.value = config.defaultValue;
				controlWrapper.appendChild(el);
			} else if (config.type === 'checkbox') {
				controlWrapper.innerHTML = '';
				const div = document.createElement('div');
				div.style.display = 'flex';
				div.style.alignItems = 'center';
				div.style.justifyContent = 'space-between';
				div.style.height = '32px';
				div.style.gap = '8px';
				
				const lbl = document.createElement('label');
				lbl.style.margin = '0';
				lbl.style.cursor = 'pointer';
				lbl.htmlFor = key;
				lbl.textContent = translate(key);
				
				const el = document.createElement('input');
				el.type = 'checkbox';
				el.id = key;
				el.dataset.setting = key;
				
				div.appendChild(lbl);
				div.appendChild(el);
				controlWrapper.appendChild(div);
			} else if (config.type === 'color') {
				const el = document.createElement('input');
				el.type = 'color';
				el.id = key;
				el.dataset.setting = key;
				el.style.height = '32px';
				el.style.width = '100%';
				el.style.borderRadius = '4px';
				controlWrapper.appendChild(el);
			}

			groupContainer.appendChild(controlWrapper);
		});
		container.appendChild(groupContainer);
	});
}

export function createGlobalSettingsUI() {
	const container = document.getElementById('global-settings-container');
	container.innerHTML = '';

	for (const key in GLOBAL_SETTINGS_CONFIG) {
		const config = GLOBAL_SETTINGS_CONFIG[key];
		const wrapper = document.createElement('div');
		wrapper.className = 'control-group';
		
		const label = document.createElement('label');
		label.textContent = translate(key);
		
		if (config.type === 'select') {
			wrapper.appendChild(label);
			const select = createCustomSelect(key, config.options, config.defaultValue, updateSetting, true);
			wrapper.appendChild(select);
		} else if (config.type === 'checkbox') {
			const div = document.createElement('div');
			div.style.display = 'flex';
			div.style.alignItems = 'center';
			div.style.justifyContent = 'space-between';
			div.style.height = '32px';
			div.style.gap = '8px';
			
			const lbl = document.createElement('label');
			lbl.style.margin = '0';
			lbl.style.cursor = 'pointer';
			lbl.htmlFor = key;
			lbl.textContent = translate(key);
			
			const el = document.createElement('input');
			el.type = 'checkbox';
			el.id = key;
			el.dataset.global = key;
			el.checked = config.defaultValue;
			
			div.appendChild(lbl);
			div.appendChild(el);
			wrapper.appendChild(div);
		} else if (config.type === 'range') {
			const row = document.createElement('div');
			row.className = 'slider-row';
			const badge = document.createElement('span');
			badge.id = `${key}Value`;
			badge.className = 'value-badge';
			badge.textContent = `${config.defaultValue}${config.unit || ''}`;
			row.appendChild(label);
			row.appendChild(badge);
			wrapper.appendChild(row);

			const el = document.createElement('input');
			el.type = 'range';
			el.id = key;
			el.dataset.global = key;
			el.min = config.min;
			el.max = config.max;
			el.step = config.step;
			el.value = config.defaultValue;
			wrapper.appendChild(el);
		} else {
			wrapper.appendChild(label);
			const el = document.createElement('input');
			el.type = config.type;
			el.id = key;
			el.dataset.global = key;
			el.value = config.defaultValue;
			if (config.type === 'color') {
				el.style.height = '32px';
				el.style.width = '100%';
				el.style.borderRadius = '4px';
			}
			wrapper.appendChild(el);
		}
		
		container.appendChild(wrapper);
	}
}

export function createGeometryUI(s) {
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

export function resizeCanvas() {
	const container = canvas.parentElement;
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
	render();
}

// Fonction qui gère l'activation des outils et l'UI associée
export function setTool(toolName) {
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
	
	try {
		const searchInput = document.getElementById('shapes-search');
		if (searchInput && searchInput.value && searchInput.value.trim() !== '') {
			// Ne rien faire, la recherche gérera la restauration
		} else {
			// Navigation vers le bon onglet même si la recherche n'était pas active
			const group = (TOOL_CONFIG[toolName] && TOOL_CONFIG[toolName].group) ? TOOL_CONFIG[toolName].group : 'drawing';
			const tabBtn = document.querySelector(`.tabs-nav .tab-btn[data-tab="${group}"]`);
			if (tabBtn && !tabBtn.classList.contains('active')) {
				// Marquer le tab comme actif
				document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
					btn.classList.toggle('active', btn === tabBtn);
				});
				const tabContent = document.getElementById(`tab-${group}`);
				if (tabContent) {
					document.querySelectorAll('.tab-content').forEach(tc => {
						tc.classList.remove('active');
					});
					tabContent.classList.add('active');
				}
			}
		}
	} catch (e) {}

	if (app.activeTool && app.activeTool.constructor.name === 'EyedropperTool') {
		canvas.style.cursor = 'none';
	} else if(app.activeTool && app.activeTool.config) {
		canvas.style.cursor = app.activeTool.config.cursor || 'default';
	} else {
		canvas.style.cursor = 'default';
	}
}

export function updateSetting(element) {
	const key = element.dataset.setting || element.dataset.global;
	const isGlobal = !!element.dataset.global;

	const config = isGlobal ? GLOBAL_SETTINGS_CONFIG[key] : SETTINGS_CONFIG[key];
	if (!config) return;

	let value;
	if (element.type === 'checkbox') {
		value = element.checked;
	} else if (element.type === 'custom-select') {
		value = element.value;
	} else if (config.type === 'range' || element.type === 'number') {
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
			if (key === 'opacity') {
				valueSpan.textContent = `${Math.round(value * 100)}%`;
			} else if (key === 'textWidth' && value === 0) {
				valueSpan.textContent = 'Auto';
			} else {
				valueSpan.textContent = `${value}${unit}`;
			}
		}
	}

	if (key === 'canvasZoom') {
		canvas.parentElement.style.setProperty('--grid-size', `${value}px`);
	}

	if (key === 'stageColor') {
		canvas.parentElement.style.backgroundColor = value;
	}

	if (key === 'arrowStyle' || key === 'freehandMode' || key === 'fillType') {
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

export function updateSettingsVisibility(toolName, shapeType = null) {
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
	const fillType = currentStyle.fillType || 'none';
	const gradientEnabled = fillType === 'linear' || fillType === 'radial';
	
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
			
			if (key === 'fillColor' && fillType === 'none') {
				isVisible = false;
			}

			if (key === 'fillColor2' && !gradientEnabled) {
				isVisible = false;
			}
			
			if (key === 'shadingAngle' && fillType !== 'linear') {
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

export function updateUIFromShape(s) {
	const geoSection = document.getElementById('geometry-section');
	const geoGroup = geoSection ? geoSection.parentElement : null;

	if (!s) {
		if (geoGroup) geoGroup.style.display = 'none';
		return;
	}
	
	if (geoGroup) geoGroup.style.display = 'flex';
	createGeometryUI(s);

	const style = s.style;
	const fields = Object.keys(SETTINGS_CONFIG);
	
	fields.forEach(id => {
		const config = SETTINGS_CONFIG[id];
		const prop = config.propName || id;
		const value = style[prop];

		if (value !== undefined) {
			if (config.type === 'select') {
				const container = document.getElementById(`select-container-${id}`);
				if (container) {
					const trigger = container.querySelector('.trigger-text');
					if (trigger) trigger.textContent = translate(config.options[value] || value);
					const items = container.querySelectorAll('.select-option');
					items.forEach(i => i.classList.toggle('selected', i.dataset.value === String(value)));
				}
			} else {
				const el = document.getElementById(id);
				if (el) {
					if (el.type === 'checkbox') {
						el.checked = !!value;
					} else {
						el.value = value;
						if (config.type === 'range') {
							const valueSpan = document.getElementById(`${id}Value`);
							if (valueSpan) {
								const unit = config.unit || '';
								if (id === 'textWidth' && value === 0) {
									valueSpan.textContent = 'Auto';
								} else {
									valueSpan.textContent = id === 'opacity' ? `${Math.round(value * 100)}%` : `${value}${unit}`;
								}
							}
						}
					}
				}
			}
		}
	});

	updateSettingsVisibility('select', s.type);
}

export function updateUIFromDrawingStyle() {
	for (const key in SETTINGS_CONFIG) {
		const config = SETTINGS_CONFIG[key];
		const prop = config.propName || key;
		const val = app.drawingStyle[prop];
		const el = document.getElementById(key);
		
		if (el && val !== undefined) {
			if (config.type === 'checkbox') {
				el.checked = val;
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

export function updateUIFromGlobalSettings() {
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

export function copyToClipboard() {
	const codeText = output.textContent;
	const copyBtn = document.getElementById('copyBtn');
	if (copyBtn.dataset.busy === 'true') return;
	
	copyBtn.dataset.busy = 'true';
	const originalContent = copyBtn.innerHTML;

	const showFeedback = (success) => {
		if (success) {
			copyBtn.innerHTML = `<i class="ti ti-check"></i> ${translate('copied')}`;
			copyBtn.classList.add('btn-copied');
			
			setTimeout(() => {
				copyBtn.innerHTML = originalContent;
				copyBtn.classList.remove('btn-copied');
				copyBtn.dataset.busy = 'false';
			}, 2000);

		} else {
			copyBtn.innerHTML = `<i class="ti ti-x"></i> ${translate('error')}`;
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

export function setupCollapsibles() {
	document.addEventListener('click', (e) => {
		const header = e.target.closest('.panel-header');
		if (!header) return;
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
}

export function setupTabs() {
	document.addEventListener('click', (e) => {
		const btn = e.target.closest('.tab-btn');
		if (!btn) return;
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
}

export function setupOutputInteraction() {
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

export function setupTextEditing() {
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
		textEditor.style.transform = 'none';
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
			textEditor.style.width = `${maxWidth + 20}px`;

			textEditor.style.left = `${screenPos.x - textEditor.offsetWidth / 2}px`;
			textEditor.style.top = `${screenPos.y - textEditor.offsetHeight / 2}px`;

			if (style.textRotate) {
				textEditor.style.transform = `rotate(${style.textRotate}deg)`;
				textEditor.style.transformOrigin = 'center center';
			} else if (style.rotate) {
				textEditor.style.transform = `rotate(${style.rotate}deg)`;
				textEditor.style.transformOrigin = 'center center';
			}

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

export function updateUndoRedoUI() {
	document.getElementById('undoBtn').disabled = app.historyIndex <= 0;
	document.getElementById('redoBtn').disabled = app.historyIndex >= app.history.length - 1;
}

export function setupLanguageSelector() {
	const currentLang = getLanguage();
	const options = LANGUAGES;
	const container = document.getElementById('lang-container');
	if (container) {
		container.innerHTML = '';
		const icon = document.createElement('i');
		icon.className = 'ti ti-language';
		icon.style.marginRight = '6px';
		icon.style.fontSize = '14px';
		icon.style.color = 'var(--text-muted)';
		container.appendChild(icon);
		const langSelect = createCustomSelect('language-selector', options, currentLang, (target) => {
			setLanguage(target.value);
		}, false);
		container.appendChild(langSelect);
	}
}

function setupShapesSearch() {
	const searchInput = document.getElementById('shapes-search');
	if (!searchInput) return;

	// ============ ÉTAT GLOBAL DE LA RECHERCHE ============
	const searchState = {
		isSearching: false,
		originalHTML: new Map(),      // Sauvegarde HTML original
		toolsData: null,               // Données JSON des outils originaux
		activeSearchListener: null     // Référence à l'event listener
	};

	// ============ ÉTAPE 1: INITIALISATION ============
	const initializeSearchState = () => {
		// Sauvegarder HTML original de chaque conteneur
		document.querySelectorAll('.tools-container').forEach(container => {
			searchState.originalHTML.set(container.id, container.innerHTML);
		});

		// Créer une copie JSON des données des outils (pour éviter les doublons)
		const toolsList = [];
		document.querySelectorAll('.tool-item-wrapper').forEach(wrapper => {
			const parentContainer = wrapper.closest('.tools-container');
			if (!parentContainer || parentContainer.id === 'tools-general') return;
			
			toolsList.push({
				toolId: wrapper.dataset.tool || '',
				html: wrapper.outerHTML,
				name: translate(wrapper.dataset.tool || '').toLowerCase(),
				description: wrapper.querySelector('.tool-btn-description')?.textContent.toLowerCase() || '',
				parentContainerId: parentContainer.id
			});
		});
		searchState.toolsData = toolsList;
	};

	// ============ ÉTAPE 2: RÉATTACHER LES EVENT LISTENERS NORMAUX ============
	const reattachNormalListeners = () => {
		// Réattacher les listeners sur tous les boutons outils
		document.querySelectorAll('.tool-btn').forEach(btn => {
			const toolId = btn.dataset.tool;
			if (toolId) {
				// Retirer les anciens listeners
				btn.removeEventListener('click', handleSearchResultClick);
				// Ajouter le listener normal
				btn.addEventListener('click', () => setTool(toolId));
			}
		});
	};

	// ============ ÉTAPE 3: MODE NORMAL - RESTAURATION ============
	const restoreNormalView = () => {
		// Restaurer HTML original
		searchState.originalHTML.forEach((html, containerId) => {
			const container = document.getElementById(containerId);
			if (container) {
				container.innerHTML = html;
			}
		});

		// Afficher tabs et réinitialiser styles
		const tabsNav = document.querySelector('.tabs-nav');
		if (tabsNav) tabsNav.style.display = '';

		const shapesSearchContainers = document.querySelectorAll('.shapes-search-container');
		shapesSearchContainers.forEach(el => {
			el.style.borderRadius = '';
			el.style.marginBottom = '';
		});

		searchState.isSearching = false;

		// Réattacher les event listeners normaux
		reattachNormalListeners();

		// Retirer le listener de recherche temporaire
		if (searchState.activeSearchListener) {
			document.removeEventListener('click', searchState.activeSearchListener);
			searchState.activeSearchListener = null;
		}
	};

	// ============ ÉTAPE 4: MODE RECHERCHE - FILTRAGE ============
	const performSearch = (query) => {
		if (!query) {
			restoreNormalView();
			return;
		}

		searchState.isSearching = true;

		// Filtrer les outils
		const matching = searchState.toolsData.filter(tool => {
			return (
				tool.toolId.toLowerCase().includes(query) ||
				tool.name.includes(query) ||
				tool.description.includes(query)
			);
		});

		// Afficher les résultats
		displaySearchResults(matching);
	};

	// ============ ÉTAPE 5: AFFICHAGE DES RÉSULTATS ============
	const displaySearchResults = (matchingTools) => {
		// Cacher les tabs
		const tabsNav = document.querySelector('.tabs-nav');
		if (tabsNav) tabsNav.style.display = 'none';

		// Modifier le style du conteneur de recherche
		const shapesSearchContainers = document.querySelectorAll('.shapes-search-container');
		shapesSearchContainers.forEach(el => {
			el.style.borderRadius = '10px';
			el.style.marginBottom = '6px';
		});

		// Obtenir le conteneur actif
		const activeTabBtn = document.querySelector('.tabs-nav .tab-btn.active');
		const activeGroup = activeTabBtn ? activeTabBtn.dataset.tab : 'drawing';
		const activeContainer = document.getElementById(`tools-${activeGroup}`);

		if (!activeContainer) return;

		// Créer le HTML des résultats
		const resultHTML = matchingTools
			.map(tool => tool.html)
			.join('');

		// Afficher les résultats
		activeContainer.innerHTML = resultHTML;

		// Ajouter les event listeners pour les résultats
		setupSearchResultsListeners();
	};

	// ============ ÉTAPE 6: EVENT LISTENERS POUR RÉSULTATS ============
	const setupSearchResultsListeners = () => {
		const activeTabBtn = document.querySelector('.tabs-nav .tab-btn.active');
		const activeGroup = activeTabBtn ? activeTabBtn.dataset.tab : 'drawing';
		const activeContainer = document.getElementById(`tools-${activeGroup}`);

		if (!activeContainer) return;

		// Ajouter un listener sur tous les boutons du conteneur actif
		activeContainer.querySelectorAll('.tool-btn').forEach(btn => {
			btn.addEventListener('click', handleSearchResultClick);
		});
	};

	// ============ ÉTAPE 7: GESTION DU CLIC SUR RÉSULTAT ============
	const handleSearchResultClick = (e) => {
		e.stopPropagation();
		const toolId = e.currentTarget.dataset.tool;

		if (toolId && searchState.isSearching) {
			// Restaurer la vue normale
			searchInput.value = '';
			restoreNormalView();

			// Sélectionner l'outil
			setTool(toolId);
		}
	};

	// ============ ÉTAPE 8: INITIALISATION AU CHARGEMENT ============
	initializeSearchState();

	// ============ ÉTAPE 9: EVENT LISTENERS PRINCIPAUX ============
	searchInput.addEventListener('input', (e) => {
		const query = e.target.value.toLowerCase().trim();
		performSearch(query);
	});

	searchInput.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			searchInput.value = '';
			restoreNormalView();
		}
	});
}

export function updateUIAfterLanguageChange() {
	createToolsUI();
	createGlobalSettingsUI();
	createSettingsUI();
	setupLanguageSelector();
	document.querySelectorAll('[data-i18n]').forEach(el => {
		el.textContent = translate(el.dataset.i18n);
	});
	document.querySelectorAll('[data-i18n-title]').forEach(el => {
		el.title = translate(el.dataset.i18nTitle);
	});
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		el.placeholder = translate(el.dataset.i18nPlaceholder);
	});
	const headerTitle = document.getElementById('header-title');
	if (headerTitle) {
		headerTitle.textContent = translate('headerTitle');
	}
	updateUIFromGlobalSettings();
	updateUIFromDrawingStyle();
	generateCode();
	if (app.selectedShape) {
		updateUIFromShape(app.selectedShape);
	} else if (app.activeTool) {
		const toolType = app.activeTool.shapeType || 'select';
		updateSettingsVisibility(toolType, null);
	}
}

export function createCustomSelect(id, options, defaultValue, onChange, isGlobal = false) {
	const container = document.createElement('div');
	container.className = 'custom-select';
	container.id = `select-container-${id}`;

	const trigger = document.createElement('div');
	trigger.className = 'select-trigger';
	
	const currentText = translate(options[defaultValue] || defaultValue);
	trigger.innerHTML = `<span class="trigger-text">${currentText}</span><i class="ti ti-chevron-down"></i>`;
	
	const list = document.createElement('div');
	list.className = 'select-options';

	Object.entries(options).forEach(([val, label]) => {
		const item = document.createElement('div');
		item.className = 'select-option';
		if (val === defaultValue) item.classList.add('selected');
		item.textContent = translate(label);
		item.dataset.value = val;
		
		item.addEventListener('click', (e) => {
			e.stopPropagation();
			list.classList.remove('open');
			trigger.classList.remove('active');
			
			const triggerText = trigger.querySelector('.trigger-text');
			if (triggerText) triggerText.textContent = translate(label);
			
			const pseudoElement = {
				id: id,
				value: val,
				dataset: isGlobal ? { global: id } : { setting: id },
				type: 'custom-select'
			};
			onChange(pseudoElement);
		});
		list.appendChild(item);
	});

	trigger.addEventListener('click', (e) => {
		e.stopPropagation();
		const isOpen = list.classList.contains('open');
		document.querySelectorAll('.select-options.open').forEach(el => el.classList.remove('open'));
		document.querySelectorAll('.select-trigger.active').forEach(el => el.classList.remove('active'));
		
		if (!isOpen) {
			list.classList.add('open');
			trigger.classList.add('active');
		}
	});

	document.addEventListener('click', () => {
		list.classList.remove('open');
		trigger.classList.remove('active');
	});

	container.appendChild(trigger);
	container.appendChild(list);
	return container;
}