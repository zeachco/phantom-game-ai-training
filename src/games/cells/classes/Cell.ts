import { lerp, getAngle, angleOffset, vecLength } from "../../../utilities/math";
import { NeuralNetwork } from "../neural-network/NeuralNetwork";

interface Enemy {
    ref: Cell;
    distance: number;
    relativeAngle: number;
    mouthDistance: number
}

export class Cell {
    public static TRACK_NB = 10
    public static RADIUS = 15
    public static MAX_NB = 10

    public label = ''
    public x = 0;
    public y = 0;
    public a = 0;
    public va = 0;
    public s = 0;
    public focused = false
    public dead = false
    public enemies: Enemy[] = []
    public energy = 100
    public atk = 0;
    public vatk = 0;

    public brain = new NeuralNetwork(Cell.TRACK_NB * 3, 4)

    constructor(instance: Partial<Cell> = {}) {
        Object.assign(this, instance);
    }

    public attack() {
        if (this.dead || this.atk > 1) return
        this.energy -= 10
        this.vatk = 20;
        this.brain.score -= 1
    }

    public forward() {
        this.s += .03
        this.brain.score -= 0.01
    }

    public turnLeft() {
        this.va -= Math.min(0.05, 1 / this.radius)
    }
    public turnRight() {
        this.va += Math.min(0.05, 1 / this.radius)
    }

    public get radius() {
        return Cell.RADIUS;// + this.energy / 100
    }

    public update() {
        this.s *= 0.99
        this.va *= 0.7
        this.vatk *= 0.9
        this.atk = (this.atk + this.vatk) * .7
        if (this.dead) return
        this.energy -= this.s / 50
        this.energy -= this.va / 100
        this.x += Math.cos(this.a) * this.s
        this.y += Math.sin(this.a) * this.s
        this.a += this.va
        if (this.a > Math.PI) this.a -= Math.PI * 2
        if (this.a < -Math.PI) this.a += Math.PI * 2
    }

    public updateEnemies(cells: Cell[]) {
        this.enemies = []
        if (this.dead) return;

        for (let index = 0; index < cells.length; index++) {
            const cell = cells[index];
            if (cell === this || cell.dead) continue;

            const [selfMouthX, selfMouthY] = this.projectedPosition();
            const [foeMouthX, foeMouthY] = cell.projectedPosition();

            const distance = vecLength(selfMouthX - cell.x, selfMouthY - cell.y)
            const mouthDistance = vecLength(this.x - foeMouthX, this.y - foeMouthY)

            if (distance < this.mouthSize + cell.radius) {
                this.eat(cell)
            }

            const [bx, by] = this.relativePosition(cell)

            const globalAngle = getAngle(bx, by)
            const relativeAngle = angleOffset(this.a, globalAngle)


            this.enemies.push({
                ref: cell,
                distance,
                relativeAngle,
                mouthDistance,
            })
        }

        this.enemies.sort((a, b) => a.distance - b.distance)

    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.focused) this.drawRelations(ctx)
        const frontAngle = Math.PI * lerp(0.15, .4, this.atk / 50)

        if (this.dead) {
            ctx.fillStyle = 'rgba(255, 255, 255, .05)'
            ctx.strokeStyle = 'rgba(255, 255, 255, .25)'
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, .8)'
            ctx.fillStyle = this.focused ? 'rgba(255, 128, 128, .8)' : 'rgba(0, 128, 128, .8)'
        }

        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.a)
        ctx.beginPath()
        // body
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, this.radius, frontAngle, Math.PI * 2 - frontAngle)
        ctx.lineTo(0, 0)
        // mouth
        ctx.arc(this.attkRange, 0, this.mouthSize, frontAngle, Math.PI * 2 - frontAngle)
        ctx.lineTo(0, 0)
        ctx.stroke()
        ctx.fill()
        ctx.restore()

        this.drawScore(ctx)
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
        this.enemies.slice(0, Cell.TRACK_NB).forEach((target, index) => {
            const alpha = 1 - index / Cell.TRACK_NB
            ctx.beginPath()
            const [px, py] = this.projectedPosition()

            if (target.distance <= target.mouthDistance) {
                ctx.strokeStyle = `rgba(0, 128, 0, ${alpha})`
            } else {
                ctx.strokeStyle = `rgba(255, 128, 0, ${alpha})`
            }

            ctx.moveTo(px, py)
            ctx.strokeStyle = `rgba(0, 128, 0, ${alpha})`
            ctx.lineTo(target.ref.x, target.ref.y)
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
        const speedDiff = this.s - cell.s
        this.brain.score += chunk * speedDiff
        cell.brain.score -= chunk * speedDiff

        if (cell.energy < 2) {
            cell.dead = true
        }
    }

    private drawScore(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'white'
        ctx.textAlign = "center"
        const offsetY = this.y > Cell.RADIUS * 4 ? this.y - Cell.RADIUS * 2 : this.y + Cell.RADIUS * 2
        ctx.fillText(`${this.label} ${this.brain.score.toFixed()}`, this.x, offsetY)
    }
}