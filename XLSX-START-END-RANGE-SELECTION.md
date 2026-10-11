# XLSX start-to-end range selection

Spreadsheet drag selection is now rectangular rather than constrained to a single row or column. Drag from cell B2 to E5 to select B2:E5, including both endpoints. Dragging in the reverse direction selects the same bounds. The selection is limited to the worksheet where the gesture started.

The selected matrix retains all intermediate rows and columns, styles, formulas, number formats, row heights, and column widths where available. The Copy selected range action copies the rectangle as tab-separated values. Header click shortcuts for a full row or full column remain available.
