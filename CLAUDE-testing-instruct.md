# Screen Testing Instructions

MCP Server: ios-simulator
Constrain {
    -Use describe all to get json data of UI elements
    -tap coordinates calculate center and offset (0,10) use whole numbers. 
    -use AXLAbel as identifier
        -Map { "☰" = Menu }
    -tap Feedback = Long press the AXSwitch
}

SudokuGrid Map {
    -address like cell(x:1-9,y:1-9)
    -The grid consists of 9 rows and 9 columns. The following formula is used to calculate the screen coordinates for any cell:
    
    - Top-left cell (cell(1,1))**: (62, 184)
    - Bottom-right cell (cell(9,9))**: (347, 471)
    - Cell Width**: `(347 - 62) / 8 ≈ 35.625`
    - Cell Height**: `(471 - 184) / 8 ≈ 35.875`

    -For a given cell(row, col):
        - `x = 62 + (col - 1) * Cell Width`
        - `y = 184 + (row - 1) * Cell Height`
    #### Examples
    - **cell(1,1)**: (62, 184)
    - **cell(1,9)**: (347, 184)
    - **cell(9,1)**: (62, 471)
    - **cell(9,9)**: (347, 471)
    - **cell(7,4)**: (170, 401)
    - **cell(6,4)**: (170, 360)
    - **cell(5,4)**: (170, 319)
}

create_pull_request