# XLSX/Excel selection fidelity update

- Selected spreadsheet items render in a dedicated horizontally scrollable viewport; the table is allowed to remain wider than the Selected Content card rather than wrapping into a narrow vertical stack.
- Workbook column widths (`!cols` wpx/wch) and row heights (`!rows` hpx/hpt) are applied to the extracted HTML where available.
- Clicking a cell auto-adds that cell with spreadsheet metadata.
- Dragging from one cell to another selects the rectangular range in any direction and auto-adds it.
- Auto horizontal selects the current row; Auto vertical selects the current column.
- Cell borders, computed styles, wrapping, and dimensions are copied into the selected table. The original workbook is unchanged.
