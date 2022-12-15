import { lerp, getAngle, angleOffset, vecLength, randInt } from "../../../utilities/math";
import { factionOffset, FACTIONS, MAX_FACTIONS } from "../factions";
import { NeuralNetwork } from "../neural-network/NeuralNetwork";

interface Target {
    x: number;
    y: number;
    distance: number;
    opportunity: number
}

export class Cell {
    public static TRACK_NB = 3
    public static RADIUS = 10
    public static MAX_NB = 20

    public faction: number = randInt(0, MAX_FACTIONS - 1);

    public label = this.faction + ''
    public x = 0;
    public y = 0;
    public vx = 0;
    public vy = 0;
    public a = 0;
    public va = 0;
    public s = 0;
    public focused = false
    public dead = false
    public others: Target[] = []
    public energy = 100
    public atk = 0;
    public vatk = 0;

    public brain = new NeuralNetwork(Cell.MAX_NB * 2, 3, [Cell.MAX_NB, 5])

    constructor(instance: Partial<Cell> = {}) {
        Object.assign(this, instance);
    }

    public forward() {
        this.vx += Math.cos(this.a) * .2
        this.vy += Math.sin(this.a) * .2
        this.brain.score -= 0.01
    }
    public turnLeft() {
        this.va -= 0.02
    }
    public turnRight() {
        this.va += 0.02
    }
    public get radius() {
        return Cell.RADIUS + this.energy / 20
    }

    public update() {
        this.s *= 0.99
        this.va *= 0.8
        this.vx *= 0.9
        this.vy *= 0.9
        this.vatk *= 0.9
        this.atk = (this.atk + this.vatk) * .7
        if (this.dead) return
        this.energy -= this.s / 50
        this.energy -= this.va / 100
        this.x += this.vx
        this.y += this.vy
        this.a += this.va
        if (this.a > Math.PI) this.a -= Math.PI * 2
        if (this.a < -Math.PI) this.a += Math.PI * 2
        if (this.brain.score < -25) this.dead = true
    }

    public updateTargets(others: Cell[], gw, gh) {
        this.others = []
        if (this.dead) return;

        for (let index = 0; index < others.length; index++) {
            const other = others[index];
            if (other.dead || other.faction === this.faction) continue;
            const distance = vecLength(this.x - other.x, this.y - other.y)
            let opportunity = 0
            const isPredator = factionOffset(this.faction, 1) === other.faction
            const isPrey = factionOffset(this.faction, -1) === other.faction
            if (isPredator) opportunity--
            if (isPrey) opportunity++
            if (distance < this.radius + other.radius) {
                // Collide with predator
                if (factionOffset(this.faction, 1) === other.faction) {
                    this.dead = true
                    this.brain.score -= 10
                }

                // Collide with prey 
                if (factionOffset(this.faction, -1) === other.faction) {
                    other.dead = true
                    this.brain.score += 10
                }
            }

            let x = other.x
            let y = other.y
            if (x - this.x > gw / 2) x -= gw
            if (x - this.x < gw / -2) x += gw
            if (this.y - y < gh / -2) y -= gh
            if (this.y - y > gh / 2) y += gh

            this.others.push({
                x,
                y,
                distance,
                opportunity,
            })
        }

        this.others.sort((a, b) => a.distance - b.distance)

    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.focused) this.drawRelations(ctx)
        this.drawBody(ctx)
        this.drawScore(ctx)
    }

    private drawBody(ctx: CanvasRenderingContext2D) {
        const alpha = this.focused ? 1 : .4
        const target = factionOffset(this.faction, -1)
        const frontAngle = Math.PI * .1
        ctx.lineWidth = 3
        ctx.strokeStyle = `hsla(${FACTIONS[this.faction]}, 100%, 70%, ${alpha})`
        ctx.fillStyle = `hsla(${FACTIONS[this.faction]}, 100%, 50%, ${alpha})`

        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.a)
        ctx.beginPath()
        // body
        ctx.moveTo(this.radius * .5, 0)
        ctx.arc(0, 0, this.radius, frontAngle, Math.PI * 2 - frontAngle)
        ctx.lineTo(this.radius * .5, 0)

        ctx.stroke()
        ctx.fill()
        ctx.beginPath()

        ctx.strokeStyle = `hsla(${FACTIONS[target]}, 100%, 80%, ${alpha})`
        ctx.fillStyle = `hsla(${FACTIONS[target]}, 100%, 20%, ${alpha})`
        ctx.lineTo(0, 0)
        ctx.lineTo(this.radius + 5, 0)
        ctx.stroke()
        ctx.fill()

        ctx.restore()
    }

    private drawRelations(ctx: CanvasRenderingContext2D) {
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 2
        this.others.slice(0, Cell.TRACK_NB).forEach((target, index) => {
            const alpha = 1 / (1 + index)
            ctx.beginPath()
            ctx.strokeStyle = target.opportunity > 0 ? `rgba(0, 255, 0, ${alpha})` : `rgba(255, 128, 0, ${alpha})`
            ctx.moveTo(this.x, this.y)
            ctx.lineTo(target.x, target.y)
            ctx.stroke()
        })
        ctx.setLineDash([]);
    }

    private drawScore(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'white'
        ctx.textAlign = "center"
        ctx.textBaseline = 'middle'
        const offsetY = this.y > Cell.RADIUS * 5 ? this.y - Cell.RADIUS * 2 : this.y + Cell.RADIUS * 2
        if (this.focused) ctx.fillText(`${this.brain.score.toFixed(0)}`, this.x, offsetY)
    }
}