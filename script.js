document.addEventListener('DOMContentLoaded', () => {
	const puzzleContainer = document.getElementById('puzzle-container');
	if (!puzzleContainer) {
		console.error("Puzzle container not found!");
		return;
	}

	// --- Piece Configuration Store ---
	const pieceConfigStore = new Map();

	// Helper function to get piece ID
	function getPieceId(piece) {
		return piece.id.replace('piece-', '');
	}

	// Helper function to create piece ID
	function createPieceId(id) {
		return `piece-${id}`;
	}

	// --- Local Storage Functions ---
	function saveToLocalStorage() {
		const storeData = Array.from(pieceConfigStore.entries()).map(([id, config]) => ({
			id,
			...config
		}));
		localStorage.setItem('puzzlePieces', JSON.stringify(storeData));
		console.log('Saved to localStorage:', storeData);
	}

	function loadFromLocalStorage() {
		const savedData = localStorage.getItem('puzzlePieces');
		if (savedData) {
			const storeData = JSON.parse(savedData);
			console.log('Loading from localStorage:', storeData);
			
			// Clear existing pieces
			puzzleContainer.innerHTML = '';
			
			// Recreate pieces from saved data
			storeData.forEach(pieceData => {
				const { id, top, right, bottom, left, position, labelText, color } = pieceData;
				const config = {
					top,
					right,
					bottom,
					left,
					labelText: labelText || `Piece ${id}`,
					initialX: position[0],
					initialY: position[1],
					color: color || 'lightblue'
				};
				const piece = createPuzzlePieceElement(id, config);
				puzzleContainer.appendChild(piece);
			});
			
			return true;
		}
		return false;
	}

	// --- Modal Functionality ---
	const modal = document.getElementById('piece-edit-modal');
	const closeModal = document.querySelector('.close-modal');
	const pieceLabelInput = document.getElementById('piece-label');
	const topEdgeSelect = document.getElementById('top-edge');
	const rightEdgeSelect = document.getElementById('right-edge');
	const bottomEdgeSelect = document.getElementById('bottom-edge');
	const leftEdgeSelect = document.getElementById('left-edge');
	const deletePieceButton = document.getElementById('delete-piece');
	const saveChangesButton = document.getElementById('save-changes');

	let currentPiece = null;

	function showModal(piece) {
		currentPiece = piece;
		const pieceId = getPieceId(piece);
		const label = piece.querySelector('.piece-label');
		
		console.log('Opening modal for piece:', pieceId);
		console.log('Current store contents:', Array.from(pieceConfigStore.entries()));
		
		// Get current values
		const currentLabel = label.textContent;
		
		// Set modal values
		pieceLabelInput.value = currentLabel;
		
		// Get edge types from the store
		const pieceConfig = pieceConfigStore.get(pieceId);
		console.log('Retrieved config for piece:', pieceId, pieceConfig);
		
		if (pieceConfig) {
			// Set select values based on stored edge types
			topEdgeSelect.value = pieceConfig.top;
			rightEdgeSelect.value = pieceConfig.right;
			bottomEdgeSelect.value = pieceConfig.bottom;
			leftEdgeSelect.value = pieceConfig.left;
		} else {
			console.warn('No configuration found for piece:', pieceId);
			// Fallback to default values if not found in store
			topEdgeSelect.value = EdgeType.FLAT;
			rightEdgeSelect.value = EdgeType.FLAT;
			bottomEdgeSelect.value = EdgeType.FLAT;
			leftEdgeSelect.value = EdgeType.FLAT;
		}
		
		modal.style.display = 'block';
	}

	function hideModal() {
		modal.style.display = 'none';
		currentPiece = null;
	}

	// Modal event listeners
	closeModal.addEventListener('click', hideModal);
	window.addEventListener('click', (e) => {
		if (e.target === modal) {
			hideModal();
		}
	});

	deletePieceButton.addEventListener('click', () => {
		if (currentPiece) {
			const pieceId = getPieceId(currentPiece);
			console.log('Deleting piece configuration:', pieceId);
			pieceConfigStore.delete(pieceId);
			currentPiece.remove();
			saveToLocalStorage();
			hideModal();
		}
	});

	saveChangesButton.addEventListener('click', () => {
		if (currentPiece) {
			const pieceId = getPieceId(currentPiece);
			const label = currentPiece.querySelector('.piece-label');
			label.textContent = pieceLabelInput.value;
			
			// Create new piece with updated edge types
			const newConfig = {
				top: topEdgeSelect.value,
				right: rightEdgeSelect.value,
				bottom: bottomEdgeSelect.value,
				left: leftEdgeSelect.value,
				labelText: pieceLabelInput.value,
				initialX: parseInt(currentPiece.style.left),
				initialY: parseInt(currentPiece.style.top),
				color: currentPiece.querySelector('.puzzle-piece-path').style.fill
			};
			
			// Update the store
			console.log('Updating configuration for piece:', pieceId, newConfig);
			pieceConfigStore.set(pieceId, {
				top: newConfig.top,
				right: newConfig.right,
				bottom: newConfig.bottom,
				left: newConfig.left,
				position: [newConfig.initialX, newConfig.initialY],
				labelText: newConfig.labelText,
				color: newConfig.color
			});
			
			// Replace the old piece with a new one
			const newPiece = createPuzzlePieceElement(pieceId, newConfig);
			currentPiece.replaceWith(newPiece);
			
			saveToLocalStorage();
			hideModal();
		}
	});

	// --- Configuration ---
	const PIECE_WIDTH = 100;
	const PIECE_HEIGHT = 100;
	const TAB_SIZE = 20; // How far the tab extends/indents from the baseline
	// Controls the shape/curve of the tab/indent. Smaller values -> flatter; larger -> more pronounced curve handle offset
	const CURVE_HANDLE_FACTOR = 0.55; // Bezier curve handle length factor (adjust for appearance)

	// --- Edge Types ---
	const EdgeType = {
		FLAT: 'flat',
		TAB_OUT: 'tab_out', // Protrudes outwards
		TAB_IN: 'tab_in'   // Indents inwards
	};

	// --- NEW Helper: Generate SVG Path segment between two points ---
	// Uses absolute L and C commands. Returns a string like " L x,y C c1x,c1y c2x,c2y x2,y2 L xEnd, yEnd"
	function generateEdgeSegment(x1, y1, x2, y2, type) {
		const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

		// If the edge is flat or too short for a curve, just draw a line
		if (type === EdgeType.FLAT || length < TAB_SIZE * 2) { // Ensure enough length for a tab
			return ` L ${x2},${y2}`;
		}

		// Normalized direction vector (from p1 to p2)
		const dirX = (x2 - x1) / length;
		const dirY = (y2 - y1) / length;

		// Perpendicular vector (rotated 90 degrees clockwise from direction) - points "out" relative to drawing direction
		const perpX = dirY;
		const perpY = -dirX;

		// Tab parameters
		const tabWidthRatio = 0.4; // How much of the edge length the tab base occupies
		const tabWidth = tabWidthRatio * length;
		// Depth of the curve: positive for TAB_OUT, negative for TAB_IN
		const tabDepth = TAB_SIZE * ((type === EdgeType.TAB_OUT) ? 1 : -1);
		// Length of the straight line segments before and after the curve
		const segmentLength = (length - tabWidth) / 2;

		// Point A: End of the first straight segment (start of the curve)
		const pA_x = x1 + dirX * segmentLength;
		const pA_y = y1 + dirY * segmentLength;

		// Point B: Start of the second straight segment (end of the curve)
		const pB_x = x2 - dirX * segmentLength;
		const pB_y = y2 - dirY * segmentLength;

		// --- Control points for a single Bezier Curve (C command) ---
		// Bezier curve C: (startpoint implicitly pA) c1x,c1y c2x,c2y endPoint(pB)
		// We offset control points perpendicularly for depth, and along the edge for shape.
		const handleLength = tabWidth * CURVE_HANDLE_FACTOR / 2; // How far control points extend along the edge direction

		// Control point 1 (near pA)
		const cp1_x = pA_x + dirX * handleLength + perpX * tabDepth;
		const cp1_y = pA_y + dirY * handleLength + perpY * tabDepth;

		// Control point 2 (near pB)
		const cp2_x = pB_x - dirX * handleLength + perpX * tabDepth;
		const cp2_y = pB_y - dirY * handleLength + perpY * tabDepth;

		// Construct the path segment string
		let segmentPath = ` L ${pA_x},${pA_y}`; // Line from previous point to start of curve (pA)
		segmentPath += ` C ${cp1_x},${cp1_y} ${cp2_x},${cp2_y} ${pB_x},${pB_y}`; // The curve from pA to pB
		segmentPath += ` L ${x2},${y2}`; // Line from end of curve (pB) to the final edge endpoint (x2, y2)

		return segmentPath;
	}


	// --- Generate a single puzzle piece SVG element (Revised) ---
	function createPuzzlePieceElement(id, config) {
		const { top, right, bottom, left, labelText, initialX, initialY, color } = config;

		// Store the edge configuration
		console.log('Creating piece with configuration:', id, config);
		pieceConfigStore.set(id, {
			top,
			right,
			bottom,
			left,
			position: [initialX, initialY],
			labelText,
			color
		});

		// Create the wrapper div
		const wrapper = document.createElement('div');
		wrapper.id = createPieceId(id);
		wrapper.className = 'puzzle-piece-wrapper';
		wrapper.style.left = `${initialX}px`;
		wrapper.style.top = `${initialY}px`;
		// Set base size for layout, SVG might visually overflow this slightly
		wrapper.style.width = `${PIECE_WIDTH}px`;
		wrapper.style.height = `${PIECE_HEIGHT}px`;

		// Create SVG Canvas
		const svgNS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgNS, "svg");
		// Padding around the WxH box to ensure curves are visible
		const viewBoxPad = TAB_SIZE * 1.2; // Give a little extra room
		// ViewBox defines the coordinate system inside the SVG
		svg.setAttribute('viewBox', `${-viewBoxPad} ${-viewBoxPad} ${PIECE_WIDTH + 2 * viewBoxPad} ${PIECE_HEIGHT + 2 * viewBoxPad}`);
		// Set the actual display size of the SVG element itself
		svg.setAttribute('width', PIECE_WIDTH + 2 * viewBoxPad);
		svg.setAttribute('height', PIECE_HEIGHT + 2 * viewBoxPad);
		svg.setAttribute('class', 'puzzle-piece-svg');
		// IMPORTANT: Offset the SVG within the wrapper to align the logical 0,0 of the piece
		// with the wrapper's top-left corner before transforms.
		svg.style.position = 'absolute';
		svg.style.left = `${-viewBoxPad}px`;
		svg.style.top = `${-viewBoxPad}px`;


		// Define Path using Absolute Coordinates
		const path = document.createElementNS(svgNS, "path");

		// Start at the top-left corner (logical 0,0)
		let d = `M 0,0`;

		// Top Edge: (0,0) -> (PIECE_WIDTH, 0)
		d += generateEdgeSegment(0, 0, PIECE_WIDTH, 0, top);

		// Right Edge: (PIECE_WIDTH, 0) -> (PIECE_WIDTH, PIECE_HEIGHT)
		d += generateEdgeSegment(PIECE_WIDTH, 0, PIECE_WIDTH, PIECE_HEIGHT, right);

		// Bottom Edge: (PIECE_WIDTH, PIECE_HEIGHT) -> (0, PIECE_HEIGHT)
		d += generateEdgeSegment(PIECE_WIDTH, PIECE_HEIGHT, 0, PIECE_HEIGHT, bottom);

		// Left Edge: (0, PIECE_HEIGHT) -> (0, 0)
		d += generateEdgeSegment(0, PIECE_HEIGHT, 0, 0, left);

		d += " Z"; // Close the path - should now correctly join back to M 0,0

		path.setAttribute("d", d);
		path.setAttribute("class", "puzzle-piece-path");
		if (color) {
			path.style.fill = color;
		} else {
			path.style.fill = 'lightblue'; // Default color if none provided
		}

		svg.appendChild(path);
		wrapper.appendChild(svg); // Add SVG to wrapper

		// Add Text Label - Positioned relative to the wrapper
		const label = document.createElement('div');
		label.className = 'piece-label';
		label.textContent = labelText || '';
		// Center the label within the logical PIECE_WIDTH x PIECE_HEIGHT area
		label.style.width = `${PIECE_WIDTH}px`; // Give width for centering text
		label.style.position = 'absolute'; // Position relative to wrapper
		label.style.top = `${PIECE_HEIGHT / 2}px`; // Center vertically in the base H area
		label.style.left = `${PIECE_WIDTH / 2}px`;  // Center horizontally in the base W area
		label.style.transform = 'translate(-50%, -50%)'; // Fine-tune centering

		// Handle double-click on the wrapper to show edit modal
		wrapper.addEventListener('dblclick', (e) => {
			e.stopPropagation(); // Prevent any other double-click handlers
			showModal(wrapper);
		});

		// Remove the old label editing handlers since we're using the modal now
		// Handle label editing completion
		label.addEventListener('blur', () => {
			label.contentEditable = false;
		});

		// Prevent dragging when editing
		label.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});

		wrapper.appendChild(label); // Add label to wrapper

		// Add delete button
		const deleteButton = document.createElement('div');
		deleteButton.className = 'delete-button';
		deleteButton.innerHTML = '×';
		deleteButton.addEventListener('click', (e) => {
			e.stopPropagation(); // Prevent dragging when clicking delete
			wrapper.remove();
		});
		wrapper.appendChild(deleteButton);

		// Add dragging behaviour to the wrapper
		addDragFunctionality(wrapper);

		return wrapper;
	}

	// --- Drag and Drop Functionality (Unchanged) ---
	function addDragFunctionality(element) {
		let isDragging = false;
		let startX, startY, initialLeft, initialTop;

		element.addEventListener('mousedown', startDrag);
		element.addEventListener('touchstart', startDrag, { passive: false });

		function startDrag(e) {
			// Allow dragging text input elements normally
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
				return;
			}
			e.preventDefault();

			isDragging = true;
			element.classList.add('dragging');
			element.style.zIndex = 1000; // Bring to front

			const currentX = e.type === 'touchstart' ? e.touches[0].pageX : e.pageX;
			const currentY = e.type === 'touchstart' ? e.touches[0].pageY : e.pageY;

			startX = currentX;
			startY = currentY;
			initialLeft = element.offsetLeft;
			initialTop = element.offsetTop;

			document.addEventListener('mousemove', drag);
			document.addEventListener('mouseup', endDrag);
			document.addEventListener('touchmove', drag, { passive: false });
			document.addEventListener('touchend', endDrag);
			document.addEventListener('touchcancel', endDrag);
		}

		function drag(e) {
			if (!isDragging) return;
			e.preventDefault();

			const currentX = e.type === 'touchmove' ? e.touches[0].pageX : e.pageX;
			const currentY = e.type === 'touchmove' ? e.touches[0].pageY : e.pageY;

			const dx = currentX - startX;
			const dy = currentY - startY;

			element.style.left = `${initialLeft + dx}px`;
			element.style.top = `${initialTop + dy}px`;
		}

		function endDrag(e) {
			if (!isDragging) return;
			isDragging = false;
			element.classList.remove('dragging');
			element.style.zIndex = ''; // Reset z-index

			document.removeEventListener('mousemove', drag);
			document.removeEventListener('mouseup', endDrag);
			document.removeEventListener('touchmove', drag);
			document.removeEventListener('touchend', endDrag);
			document.removeEventListener('touchcancel', endDrag);

			// Update position in store and save to localStorage
			const pieceId = getPieceId(element);
			const config = pieceConfigStore.get(pieceId);
			if (config) {
				config.position = [parseInt(element.style.left), parseInt(element.style.top)];
				saveToLocalStorage();
			}
		}
	}

	// --- Initial piece creation ---
	const initialPieces = [
		{
			top: EdgeType.FLAT,
			right: EdgeType.TAB_OUT,  // Will connect with piece 2's left edge
			bottom: EdgeType.TAB_OUT,  // Will connect with piece 3's top edge
			left: EdgeType.FLAT,
			initialX: puzzleContainer.offsetWidth / 2 - PIECE_WIDTH,  // Center horizontally
			initialY: puzzleContainer.offsetHeight / 2 - PIECE_HEIGHT,  // Center vertically
			color: 'lightblue'
		},
		{
			top: EdgeType.FLAT,
			right: EdgeType.FLAT,
			bottom: EdgeType.TAB_IN,   // Will connect with piece 4's top edge
			left: EdgeType.TAB_IN,     // Will connect with piece 1's right edge
			initialX: puzzleContainer.offsetWidth / 2,  // Center horizontally + one piece width
			initialY: puzzleContainer.offsetHeight / 2 - PIECE_HEIGHT,  // Center vertically
			color: 'lightgreen'
		},
		{
			top: EdgeType.TAB_IN,      // Will connect with piece 1's bottom edge
			right: EdgeType.TAB_OUT,   // Will connect with piece 4's left edge
			bottom: EdgeType.FLAT,
			left: EdgeType.FLAT,
			initialX: puzzleContainer.offsetWidth / 2 - PIECE_WIDTH,  // Center horizontally
			initialY: puzzleContainer.offsetHeight / 2,  // Center vertically + one piece height
			color: 'lightpink'
		},
		{
			top: EdgeType.TAB_OUT,     // Will connect with piece 2's bottom edge
			right: EdgeType.FLAT,
			bottom: EdgeType.FLAT,
			left: EdgeType.TAB_IN,     // Will connect with piece 3's right edge
			initialX: puzzleContainer.offsetWidth / 2,  // Center horizontally + one piece width
			initialY: puzzleContainer.offsetHeight / 2,  // Center vertically + one piece height
			color: 'lightyellow'
		}
	];

	// Try to load saved state, if none exists create initial pieces
	if (!loadFromLocalStorage()) {
		initialPieces.forEach((config, index) => {
			const pieceId = (index + 1).toString();
			const piece = createPuzzlePieceElement(pieceId, {
				...config,
				labelText: `Piece ${pieceId}`
			});
			puzzleContainer.appendChild(piece);
			console.log('Created initial piece:', pieceId, config);
		});
		saveToLocalStorage();
	}

	// --- NEW: Add piece button functionality ---
	const addPieceButton = document.getElementById('add-piece-button');
	if (addPieceButton) {
		addPieceButton.addEventListener('click', () => {
			// Generate a random ID for the new piece
			const newId = Date.now().toString();
			// Count the number of existing pieces to determine the label
			const existingPieces = puzzleContainer.getElementsByClassName('puzzle-piece-wrapper').length;
			const labelText = `Piece ${existingPieces + 1}`;
			// Randomly select edge types (FLAT, TAB_OUT, or TAB_IN)
			const edgeTypes = [EdgeType.FLAT, EdgeType.TAB_OUT, EdgeType.TAB_IN];
			const config = {
				top: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
				right: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
				bottom: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
				left: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
				labelText: labelText,
				initialX: 50,
				initialY: 50,
				color: 'lightblue'
			};
			const newPiece = createPuzzlePieceElement(newId, config);
			puzzleContainer.appendChild(newPiece);
			console.log('Added new piece:', newId, config);
			saveToLocalStorage();
		});
	} else {
		console.error("Add piece button not found!");
	}
});