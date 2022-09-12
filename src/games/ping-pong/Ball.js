export class Ball {
    x;
    y;
    size;
    vx = 0;
    vy = 0;
    acc = 1.001;
    color;
    constructor(x, y, size = Math.random() * 20 + 5) {
        this.x = x;
        this.y = y;
        this.size = size;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 0.5;
        setTimeout(() => {
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }, Math.random() * 3000);
        const colorAngle = Math.round(Math.random() * 360);
        this.color = `hsla(${colorAngle}, 100%, 50%, 90%)`;
    }
    render(ctx) {
        this.x += this.vx;
        this.y += this.vy;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}
