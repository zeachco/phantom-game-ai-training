import { lerp, getAngle, angleOffset } from "../../../utilities/math";

interface Enemy {
    ref: Cell;
    distance: number
    deltaAngle?: number
    vulnerability?: number
}

export class Cell {
    public static TRACK_NB = 10
    public static RADIUS = 10
    public static MAX_NB = 50

    public x = 0;
    public y = 0;
    public a = 0;
    public va = 0;
    public s = 0;
    public score = 0;
    public focused = false
    public dead = false
    public enemies: Enemy[] = []
    public energy = 100
    public atk = 0;
    public vatk = 0;

    constructor(instance: Partial<Cell>) {
        Object.assign(this, instance);
    }

    public attack() {
        if (this.dead || this.atk > 5) return
        this.vatk = 10;
    }

    public forward() {
        this.s += .1
    }

    public turnLeft() {
        this.va -= 0.01
    }
    public turnRight() {
        this.va += 0.01
    }

    public update() {
        this.s *= 0.99
        this.va *= 0.9
        this.vatk *= 0.99
        this.atk = (this.atk + this.vatk) * .7
        if (this.dead) return
        this.energy -= this.s / 100
        this.x += Math.cos(this.a) * this.s
        this.y += Math.sin(this.a) * this.s
        this.a += this.va / (1 + this.atk / 2)
        if (this.a > Math.PI) this.a -= Math.PI * 2
        if (this.a < -Math.PI) this.a += Math.PI * 2
    }

    public updateEnemies(cells: Cell[]) {
        this.enemies = []
        if (this.dead) return;

        for (let index = 0; index < cells.length; index++) {
            const cell = cells[index];
            if (cell === this || cell.dead) continue;
            const [dx, dy] = this.relativePosition(cell)
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < this.mouthSize + cell.radius) {
                this.eat(cell)
            }

            this.enemies.push({
                ref: cell,
                distance
            })
        }

        this.enemies.sort((a, b) => a.distance - b.distance)
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.focused) this.drawRelations(ctx)
        const frontAngle = Math.PI * this.mouthSize / 10
        ctx.strokeStyle = 'rgba(255, 255, 255, .8)'
        ctx.fillStyle = this.focused ? 'rgba(255, 128, 128, .8)' : 'rgba(0, 128, 128, .8)'

        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.a)
        ctx.beginPath()

        ctx.moveTo(0, 0)
        ctx.arc(0, 0, this.radius, frontAngle, Math.PI * 2 - frontAngle)
        ctx.lineTo(0, 0)

        // mouth
        ctx.arc(this.attkRange, 0, this.mouthSize, 0, Math.PI * 2)

        if (this.dead) {
            ctx.fillStyle = 'rgba(255, 255, 255, .05)'
            ctx.strokeStyle = 'rgba(255, 255, 255, .25)'
        }
        ctx.stroke()
        ctx.fill()
        ctx.restore()

        ctx.fillText(`${this.energy.toFixed(0)}`, this.x - 5, this.y - this.radius)
    }

    private get radius() {
        return Cell.RADIUS + this.energy / 100
    }
    private get mouthSize() {
        return this.attkRange / 4
    }

    private get attkRange() {
        return this.radius + this.atk
    }

    private drawRelations(ctx: CanvasRenderingContext2D) {
        ctx.setLineDash([7, 3]);
        ctx.lineWidth = 2
        this.enemies.slice(0, Cell.TRACK_NB).forEach(target => {
            ctx.beginPath()
            const [px, py] = this.projectedPosition()
            ctx.moveTo(px, py)
            ctx.strokeStyle = 'rgba(0, 128, 0, .5)'
            ctx.lineTo(target.ref.x, target.ref.y)
            ctx.stroke()

            ctx.beginPath()
            const [tx, ty] = target.ref.projectedPosition()
            ctx.moveTo(tx, ty)
            ctx.strokeStyle = 'rgba(255, 128, 0, .5)'
            ctx.lineTo(this.x, this.y)
            ctx.stroke()
        })
        ctx.setLineDash([]);
    }

    private projectedPosition(projection = this.attkRange) {
        const px = this.x + Math.cos(this.a) * projection
        const py = this.y + Math.sin(this.a) * projection
        return [px, py]
    }

    private relativePosition(enemy: Cell): [number, number] {
        const [px, py] = this.projectedPosition()
        const dx = px - enemy.x
        const dy = py - enemy.y
        return [dx, dy]
    }

    private eat(cell: Cell) {
        const chunk = Math.max(this.attkRange, this.atk)
        cell.energy -= chunk
        this.energy += chunk
        this.score += 1

        if (cell.energy < 5) {
            cell.dead = true
        }
    }
}