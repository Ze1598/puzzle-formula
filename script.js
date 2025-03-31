document.addEventListener('DOMContentLoaded', () => {
	const puzzleContainer = document.getElementById('puzzle-container');
	if (!puzzleContainer) {
		console.error("Puzzle container not found!");
		return;
	}

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

		// Create the wrapper div
		const wrapper = document.createElement('div');
		wrapper.id = `piece-${id}`;
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
		wrapper.appendChild(label); // Add label to wrapper

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

			// Placeholder for connection logic
			// checkForConnection(element);
		}
	}

	// --- Example Piece Definitions (Ensure compatibility) ---
	const pieces = [
		// Row 1
		{ id: 1, top: EdgeType.FLAT, right: EdgeType.TAB_OUT, bottom: EdgeType.TAB_OUT, left: EdgeType.FLAT, labelText: 'R1, C1', initialX: 50, initialY: 50, color: 'coral' },
		{ id: 2, top: EdgeType.FLAT, right: EdgeType.FLAT, bottom: EdgeType.TAB_IN, left: EdgeType.TAB_IN, labelText: 'R1, C2', initialX: 170, initialY: 50, color: 'lightblue' }, // Matches P1 right/bottom

		// Row 2
		{ id: 3, top: EdgeType.TAB_IN, right: EdgeType.TAB_OUT, bottom: EdgeType.FLAT, left: EdgeType.FLAT, labelText: 'R2, C1', initialX: 50, initialY: 170, color: 'lightgreen' }, // Matches P1 bottom
		{ id: 4, top: EdgeType.TAB_OUT, right: EdgeType.FLAT, bottom: EdgeType.FLAT, left: EdgeType.TAB_IN, labelText: 'R2, C2', initialX: 170, initialY: 170, color: 'khaki' } // Matches P3 right, P2 bottom
	];

	// Ensure piece definitions are compatible (tab_out matches tab_in on adjacent edges)
	// P1 right=out  -> P2 left=in
	// P1 bottom=out -> P3 top=in
	// P2 bottom=in  -> P4 top=out (fixed definition)
	// P3 right=out  -> P4 left=in


	// --- Generate and Add Pieces to the DOM ---
	pieces.forEach(pieceConfig => {
		const pieceElement = createPuzzlePieceElement(pieceConfig.id, pieceConfig);
		puzzleContainer.appendChild(pieceElement);
	});

});