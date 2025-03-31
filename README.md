# Puzzle Formula

An interactive web-based jigsaw puzzle piece generator and editor that allows you to create, customize, and arrange puzzle pieces with a modern, intuitive interface.

## Features

- **Interactive Puzzle Piece Creation**
  - Create custom puzzle pieces with configurable edges
  - Drag and drop pieces to arrange them
  - Double-click pieces to edit their properties
  - Add new pieces with random configurations

- **Piece Customization**
  - Customize piece labels
  - Choose piece colors with automatic text contrast adjustment
  - Configure edge types (Straight, Tab, or Indentation) for each side
  - Delete pieces as needed

- **Data Management**
  - Export puzzle configurations to JSON files
  - Import previously saved puzzle configurations
  - Automatic local storage saving of your work

- **Design**
  - Touch-friendly interface
  - Clean, modern UI with intuitive controls

## Usage

1. Open the application in your web browser
2. Use the "Add piece" button to create new puzzle pieces
3. Drag pieces around to arrange them
4. Double-click any piece to:
   - Edit its label
   - Change its color
   - Configure edge types
   - Delete the piece
5. Use the "Export data" button to save your puzzle configuration
6. Use the "Import data" button to load previously saved configurations

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS
- Uses SVG for puzzle piece rendering
- Implements Bezier curves for smooth edge transitions
- Features automatic contrast calculation for text readability
- Responsive design with mobile support

## Browser Support

The application should work on all modern web browsers that support:
- SVG
- CSS Grid and Flexbox
- Local Storage
- File API
- Touch Events