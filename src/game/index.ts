import { AddTextOptions, addText } from "../display/text";
import Coordinates from "../utils/coordinates";
import { ButtonContainer } from "@pixi/ui";
import colours from "../constants/colour";
import { basicInteractivity } from "../display/button";
import Player from "./player";
import Stage from "./stages";
import { Application, Assets, Graphics, Sprite } from "pixi.js";
import * as matter from "matter-js";
import playerConstants from "../constants/player";
import { maps } from "./map";

export default class AppEngine {
    app: Application<HTMLCanvasElement> | null =
        new Application<HTMLCanvasElement>();
    players: {
        [id: number]: Player;
    } = {};
    stage: Stage = Stage.START;

    constructor() {
        this.initApp();
        this.buildStartUI();
    }

    initApp() {
        this.app!.resizeTo = window;
        window.addEventListener("resize", () => this.app?.resize());
        document.body.appendChild(this.app!.view);
    }

    async initPlayers(id: number) {
        let player = new Player(id);
        this.players[id] = player;

        // build UI
        const play = new ButtonContainer(
            new Graphics()
                .beginFill(playerConstants[id - 1].colour)
                .drawRoundedRect(
                    (this.getWidth() * (id * 2 - 1)) / 9,
                    this.getHeight() / 4 - this.getHeight() / 20,
                    this.getWidth() / 8,
                    this.getHeight() / 10,
                    10
                )
        ).view;

        play.addChild(
            addText(
                `PLAYER ${id}`,
                new AddTextOptions()
                    .changeCoordinates(
                        new Coordinates(
                            (this.getWidth() * (id * 2 - 1)) / 9 +
                                this.getWidth() / 16,
                            this.getHeight() / 4
                        )
                    )
                    .changeFontSize(this.getHeight() / 20)
                    .changeAnchorX("center")
                    .changeAnchorY("center")
                    .changeStroke(0)
            )
        );

        const playerIndicator = new Sprite(
            await Assets.load(`/players/Player${id}.png`)
        );
        playerIndicator.anchor.set(0.5);
        playerIndicator.x =
            (this.getWidth() * (id * 2 - 1)) / 9 + this.getWidth() / 16;
        playerIndicator.y = this.getHeight() / 4 + this.getHeight() / 7;
        playerIndicator.width = this.getWidth() / 16;
        playerIndicator.height = this.getWidth() / 16;
        play.addChild(playerIndicator);

        play.onclick = () => {
            if (this.players[id]) {
                delete this.players[id];
                play.alpha = 0.5;
                playerIndicator.alpha = 0;
            } else {
                this.players[id] = new Player(id);
                play.alpha = 1;
                playerIndicator.alpha = 1;
            }
        };

        this.app!.stage.addChild(play);
    }

    getWidth() {
        return this.app!.view.width;
    }

    getHeight() {
        return this.app!.view.height;
    }

    setStages(stage: Stage) {
        this.stage = stage;
        let themeSong = new Audio("/theme.mp3");
        switch (stage) {
            case Stage.START:
                this.buildStartUI();
                break;
            case Stage.INFO:
                // play theme song
                themeSong.loop = true;
                themeSong.play();
                this.buildInfoUI();
                break;
            case Stage.GAME:
                this.buildGameUI();
                break;
            case Stage.END:
                // stop theme song
                themeSong.pause();

                setTimeout(() => {
                    let win = new Audio("/win.mp3");
                    win.play();
                    this.buildEndUI();
                }, 3000);
                break;
        }
    }

    createParticle(engine: any) {
        const particle = new matter.Bodies.circle(
            Math.random() * window.innerWidth,
            Math.random() * window.innerHeight,
            Math.random() * 1 + 1,
            {
                render: {
                    fillStyle: "#" + colours.white,
                },
                collisionFilter: {
                    group: 2,
                    mask: 0,
                },
                friction: 0,
                frictionAir: 0,
            }
        );
        // set some form of velocity
        matter.Body.setVelocity(particle, {
            x: Math.random() * 1 - 0.5,
            y: Math.random() * 1 - 0.5,
        });

        // add the particle to the world
        matter.World.add(engine.world, particle);

        setTimeout(() => {
            matter.World.remove(engine.world, particle);
            this.createParticle(engine);
        }, Math.random() * 50000);
    }

    buildStartUI() {
        this.app!.stage.addChild(
            addText(
                "COSMIC BLITZ",
                new AddTextOptions()
                    .changeCoordinates(new Coordinates(this.getWidth() / 2, 0))
                    .changeFontSize(this.getHeight() / 5)
                    .changeAnchorY("up")
            )
        );

        // instructions
        this.app!.stage.addChild(
            addText(
                "Please use a device with a keyboard and a decently big screen to play. If you notice the fonts are off, please refresh the page.",
                new AddTextOptions()
                    .changeCoordinates(
                        new Coordinates(
                            this.getWidth() / 2,
                            (this.getHeight() * 3) / 5
                        )
                    )
                    .changeFontSize(this.getHeight() / 30)
                    .changeAnchorX("center")
                    .changeAnchorY("center")
                    .changeStroke(0)
            )
        );

        const start = basicInteractivity(
            new ButtonContainer(
                new Graphics()
                    .beginFill(colours.success)
                    .drawRoundedRect(
                        this.getWidth() / 2 - this.getWidth() / 10,
                        (this.getHeight() * 3) / 4 - this.getHeight() / 20,
                        this.getWidth() / 5,
                        this.getHeight() / 10,
                        10
                    )
            ).view
        );

        start.addChild(
            addText(
                "START",
                new AddTextOptions()
                    .changeCoordinates(
                        new Coordinates(
                            this.getWidth() / 2,
                            (this.getHeight() * 3) / 4
                        )
                    )
                    .changeFontSize(this.getHeight() / 15)
                    .changeAnchorX("center")
                    .changeAnchorY("center")
            )
        );
        start.onclick = () => {
            this.app!.stage.removeChildren();
            this.setStages(Stage.INFO);
        };

        this.app!.stage.addChild(start);
        for (let i = 1; i <= 4; i++) this.initPlayers(i);
    }

    async buildInfoUI(curCount: number = 0) {
        const text = await (await fetch(`/story.txt`)).text();
        const instructions = text.split("\n\n");
        let count = curCount;

        this.app!.stage.addChild(
            addText(
                instructions[count],
                new AddTextOptions()
                    .changeCoordinates(new Coordinates(this.getWidth() / 2, 0))
                    .changeFontSize(this.getHeight() / 20)
                    .changeAnchorY("up")
            )
        );

        // 2 buttons: skip and next
        const skip = basicInteractivity(
            new ButtonContainer(
                new Graphics()
                    .beginFill(colours.error)
                    .drawRoundedRect(
                        this.getWidth() / 2 - this.getWidth() / 10,
                        (this.getHeight() * 3) / 4 - this.getHeight() / 20,
                        this.getWidth() / 5,
                        this.getHeight() / 10,
                        10
                    )
            ).view
        );

        skip.addChild(
            addText(
                "SKIP",
                new AddTextOptions()
                    .changeCoordinates(
                        new Coordinates(
                            this.getWidth() / 2,
                            (this.getHeight() * 3) / 4
                        )
                    )
                    .changeFontSize(this.getHeight() / 15)
                    .changeAnchorX("center")
                    .changeAnchorY("center")
            )
        );
        skip.onclick = () => {
            this.app!.stage.removeChildren();
            this.setStages(Stage.GAME);
        };

        const next = basicInteractivity(
            new ButtonContainer(
                new Graphics()
                    .beginFill(colours.success)
                    .drawRoundedRect(
                        this.getWidth() / 2 - this.getWidth() / 10,
                        (this.getHeight() * 3) / 4 + this.getHeight() / 10,
                        this.getWidth() / 5,
                        this.getHeight() / 10,
                        10
                    )
            ).view
        );

        next.addChild(
            addText(
                "NEXT",
                new AddTextOptions()
                    .changeCoordinates(
                        new Coordinates(
                            this.getWidth() / 2,
                            (this.getHeight() * 3) / 4 +
                                this.getHeight() / 10 +
                                this.getHeight() / 20
                        )
                    )
                    .changeFontSize(this.getHeight() / 15)
                    .changeAnchorX("center")
                    .changeAnchorY("center")
            )
        );
        next.onclick = () => {
            this.app!.stage.removeChildren();
            count++;
            if (count < instructions.length) {
                this.buildInfoUI(count);
            } else {
                this.setStages(Stage.GAME);
            }
        };

        this.app!.stage.addChild(skip);
        this.app!.stage.addChild(next);
    }

    buildGameUI() {
        // remove PIXI.js' canvas
        document.body.removeChild(
            document.body.getElementsByTagName("canvas")[0]
        );
        this.app = null;

        // create an engine
        let engine = matter.Engine.create();
        engine.gravity.scale = 0;

        // create a renderer
        let render = matter.Render.create({
            element: document.body,
            engine: engine,
            options: {
                background: "#000000",
                width: window.innerWidth,
                height: window.innerHeight,
            },
        });
        render.options.wireframes = false;

        // create runner
        let runner = matter.Runner.create();

        // create bodies
        for (let i = 1; i <= 4; i++) {
            if (this.players[i]) {
                this.players[i].createBody(runner, engine);
            }
        }

        matter.Composite.add(
            engine.world,
            Object.values(this.players).map((player) => player.player)
        );

        matter.Composite.add(engine.world, maps[0]);

        // add z-index for rendering
        matter.Events.on(engine.world, "afterAdd", (items: any) => {
            engine.world.bodies.sort((a: any, b: any) => {
                const zIndexA =
                    a.render && typeof a.render.zIndex !== "undefined"
                        ? a.render.zIndex
                        : 0;
                const zIndexB =
                    b.render && typeof b.render.zIndex !== "undefined"
                        ? b.render.zIndex
                        : 0;
                return zIndexA - zIndexB;
            });
        });

        matter.Events.on(runner, "tick", () => {
            let playersAlive = 0;
            for (let i = 1; i <= 4; i++) {
                playersAlive +=
                    !this.players[i] || this.players[i].dead ? 0 : 1;
            }
            if (playersAlive <= 1 && this.stage === Stage.GAME) {
                this.setStages(Stage.END);
            }
        });

        // run the renderer
        matter.Render.run(render);

        // run the engine
        matter.Runner.run(runner, engine);

        // others: create natural particles
        for (let i = 0; i < 100; i++) {
            this.createParticle(engine);
        }
    }

    buildEndUI() {
        document.querySelector("canvas")!.style.display = "none";
        this.app = new Application<HTMLCanvasElement>();
        this.initApp();

        const winner = Object.values(this.players).find(
            (player) => !player.dead
        );

        this.app!.stage.addChild(
            addText(
                winner ? `Player ${winner.id} wins!` : "It's a draw!",
                new AddTextOptions()
                    .changeCoordinates(
                        new Coordinates(
                            this.getWidth() / 2,
                            this.getHeight() / 4
                        )
                    )
                    .changeFontSize(this.getHeight() / 5)
                    .changeAnchorY("up")
            )
        );

        // button to visit github
        const github = basicInteractivity(
            new ButtonContainer(
                new Graphics()
                    .beginFill(colours.white)
                    .drawRoundedRect(
                        this.getWidth() / 2 - this.getWidth() / 3,
                        (this.getHeight() * 3) / 4 - this.getHeight() / 20,
                        this.getWidth() / 1.5,
                        this.getHeight() / 10,
                        10
                    )
            ).view
        );

        github.addChild(
            addText(
                "GITHUB - View the Documentation :D",
                new AddTextOptions()
                    .changeCoordinates(
                        new Coordinates(
                            this.getWidth() / 2,
                            (this.getHeight() * 3) / 4
                        )
                    )
                    .changeFontSize(this.getHeight() / 15)
                    .changeAnchorX("center")
                    .changeAnchorY("center")
            )
        );
        github.onclick = () => {
            window.location.replace("https://github.com/AJR07/Cosmic-Blitz");
        };

        this.app!.stage.addChild(github);
    }
}
