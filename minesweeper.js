// 扫雷
console.log('扫雷')
function game() {
    const self = this
    self.numRows = 0
    self.numCols = 0
    self.numMines = 0
    self.cells = []
    self.isGameover = true
    self.calculating = false
    self.initUI()
    self.newGame()
}

game.prototype.initUI = function () {
    const self = this
    self.initInput('numRows')
    self.initInput('numCols')
    self.initInput('numMines')
    document.querySelector('#newGame').addEventListener('click', function (e) {
        self.newGame()
    })
    document.querySelector('#stage').addEventListener('contextmenu', function (e) {
        e.preventDefault()
    })
}

game.prototype.initInput = function (id) {
    const self = this
    const input = document.querySelector(`#${id}`)
    input.addEventListener('input', function (e) {
        const display = input.parentElement.querySelector('label>span')
        display.innerHTML = input.value
    })
    input.dispatchEvent(new Event('input'))
}

game.prototype.newGame = function () {
    const self = this
    const stage = document.querySelector('#stage')
    document.querySelector('#stage').replaceChildren()
    self.numRows = parseInt(document.querySelector('#numRows').value)
    self.numCols = parseInt(document.querySelector('#numCols').value)
    self.numMines = parseInt(document.querySelector('#numMines').value)
    self.cells = []
    self.isGameOver = false
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    const mines = Array(self.numRows * self.numCols)
    mines.fill(true).fill(false, self.numMines)
    shuffleArray(mines)
    for (let row = 0; row < self.numRows; row++) {
        const divRow = document.createElement('div')
        divRow.className = "row"
        for (let col = 0; col < self.numCols; col++) {
            const divCell = document.createElement('div')
            divCell.className = "cell"
            const divCellInner = document.createElement('div')
            divCellInner.className = "cell-inner"
            self.cells.push({
                status: 'ready',
                hasMine: mines[row * self.numCols + col],
                divCellInner
            })
            divCell.append(divCellInner)
            divRow.append(divCell)
            divCellInner.addEventListener('click', async function () {
                if (self.calculating) return
                self.calculating = true
                self.isGameOver || await self.dig(row, col)
                self.checkWin()
                self.calculating = false
            })
            divCellInner.addEventListener('contextmenu', async function (e) {
                if (self.calculating) return
                self.calculating = true
                self.isGameOver || await self.flag(row, col)
                self.checkWin()
                e.preventDefault()
                self.calculating = false
            })
        }
        stage.append(divRow)
    }
}

game.prototype.waitFor = async function (ms) {
    return new Promise(res => {
        setTimeout(res, ms)
    })
}

game.prototype.dig = async function (row, col) {
    const self = this
    const cell = self.cells[row * self.numCols + col]
    if (cell.status !== "ready") return
    cell.divCellInner.className = "cell-inner-opened"
    if (cell.hasMine) {
        cell.divCellInner.innerHTML = "💣"
        cell.divCellInner.classList.add("cell-explode")
        self.gameOver(false)
        return
    }
    cell.status = "opened"
    const numMines = self.calc(row, col, c => c.hasMine)
    cell.divCellInner.classList.add("cell-number-" + numMines)
    if (numMines === 0) {
        const promises = self.around(row, col, async (r, c)=>{
            const ps = []
            if (self.cells[r * self.numCols + c].status === "ready") {
                await self.waitFor(50)
                ps.push(self.dig(r, c))
            }
            return Promise.all(ps)
        })
        await Promise.all(promises)
        return
    }
    cell.divCellInner.innerHTML = numMines
}

game.prototype.gameOver = async function (win) {
    const self = this
    self.isGameOver = true
    for (cell of self.cells) {
        if (cell.hasMine) {
            cell.divCellInner.classList.add("cell-inner-opened")
            if (win || cell.status === "flag") {
                cell.divCellInner.innerHTML = "✅"
                continue
            }
            if (cell.status === "ready") {
                cell.divCellInner.innerHTML = "💣"
                continue
            }
            cell.divCellInner.classList.add("cell-explode")
        }
    }
}

game.prototype.checkWin = function () {
    const self = this
    const numFlags = self.cells.filter(c => c.status === "flag").length
    const numReady = self.cells.filter(c => c.status === "ready").length
    if (numFlags + numReady === self.numMines) {
        this.gameOver(true)
    }
}

game.prototype.calc = function (row, col, filter) {
    const self = this
    let result = 0
    self.around(row, col, (r, c) => {
        if (filter(self.cells[r * self.numCols + c])) {
            result = result + 1
        }
    })
    return result
}

game.prototype.around = function (row, col, callback) {
    const self = this
    const promises = []
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r < 0 || r >= self.numRows || c < 0 || c >= self.numCols) continue
            if (r == row && c == col) continue
            const result = callback(r, c)
            if(result?.constructor === Promise){
                promises.push(result)
            }
        }
    }
    return promises
}

game.prototype.flag = async function (row, col) {
    const self = this
    const cell = self.cells[row * self.numCols + col]
    if (cell.status === "ready") {
        cell.status = "flag"
        cell.divCellInner.innerHTML = "🚩"
        return
    }
    if (cell.status === "flag") {
        cell.status = "ready"
        cell.divCellInner.innerHTML = ""
        return
    }
    const numFlags = self.calc(row, col, c => c.status === "flag")
    const numMines = self.calc(row, col, c => c.hasMine)
    if (numFlags === numMines) {
        await Promise.all(self.around(row, col, async function (r, c) { await self.dig(r, c) }))
    }
}

window.g = new game()
