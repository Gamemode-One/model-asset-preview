import {
	AmbientLight,
	AxesHelper,
	Box3,
	BoxHelper,
	Color,
	GridHelper,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
	Sphere,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Model } from 'bridge-model-viewer'
import { IGeoSchema } from 'bridge-model-viewer/dist/Schema/Model'

export interface IOptions {
	antialias?: boolean
	width?: number
	height?: number
}

export class StandaloneModelViewer {
	protected renderer: WebGLRenderer
	protected model: Model
	protected scene: Scene
	protected camera: PerspectiveCamera
	protected renderingRequested = false
	protected controls: OrbitControls

	constructor(
		protected canvasElement: HTMLCanvasElement,
		modelData: IGeoSchema,
		protected texturePath: string,
		protected options: IOptions
	) {
		this.renderer = new WebGLRenderer({
			canvas: canvasElement,
			antialias: options.antialias ?? false,
			preserveDrawingBuffer: true,
			precision: 'highp',
		})

		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.camera = new PerspectiveCamera(70, 1, 0.1, 1000)
		this.camera.position.x = -20
		this.camera.position.y = 20
		this.camera.position.z = -20

		this.controls = new OrbitControls(this.camera, canvasElement)
		this.scene = new Scene()
		this.scene.add(new AmbientLight(0xffffff))
		this.scene.background = new Color(0x121212)
		this.model = new Model(modelData, texturePath)
		this.scene.add(this.model.getModel())

		window.addEventListener('resize', () => this.onResize(true))
		this.controls.addEventListener('change', () => this.requestRendering())
		this.onResize(false)
	}

	protected get width() {
		return this.options.width ?? window.innerWidth
	}
	protected get height() {
		return this.options.height ?? window.innerHeight
	}

	protected render(checkShouldTick = true) {
		this.controls.update()
		this.renderer.render(this.scene, this.camera)
		this.renderingRequested = false

		if (checkShouldTick && this.model.shouldTick) {
			this.model.tick()
			this.requestRendering()
		}
	}

	requestRendering(immediate = false) {
		if (immediate) return this.render(false)

		if (this.renderingRequested) return

		this.renderingRequested = true
		requestAnimationFrame(() => this.render())
	}
	onResize(requestRendering = true) {
		this.canvasElement.width = this.width
		this.canvasElement.height = this.height
		this.renderer.setSize(this.width, this.height, true)
		this.camera.aspect = this.width / this.height
		this.camera.updateProjectionMatrix()

		if (requestRendering) this.requestRendering()
	}

	addHelpers() {
		this.scene.add(new AxesHelper(50))
		this.scene.add(new GridHelper(20, 20))
		this.scene.add(new BoxHelper(this.model.getModel(), 0xffff00))

		this.requestRendering()
	}
	getModel() {
		return this.model
	}

	// From: https://github.com/mrdoob/three.js/issues/6784#issuecomment-315963625
	positionCamera(scale = 1.5, rotate = true) {
		if (rotate) this.model.getModel().rotation.set(0, Math.PI, 0)
		const boundingSphere = new Box3()
			.setFromObject(this.model.getModel())
			.getBoundingSphere(new Sphere())

		const objectAngularSize = ((this.camera.fov * Math.PI) / 180) * scale
		const distanceToCamera =
			boundingSphere.radius / Math.tan(objectAngularSize / 2)
		const len = Math.sqrt(
			Math.pow(distanceToCamera, 2) + Math.pow(distanceToCamera, 2)
		)

		this.camera.position.set(len, len, len)
		this.controls.update()

		this.camera.lookAt(boundingSphere.center)
		this.controls.target.set(
			boundingSphere.center.x,
			boundingSphere.center.y,
			boundingSphere.center.z
		)

		this.camera.updateProjectionMatrix()
	}

	async generatePreview(scale = 1.5, res = 10) {
		const canvas = new OffscreenCanvas(1400 * res, 600 * res)
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		ctx.imageSmoothingEnabled = false

		const model = this.model.getModel()
		this.positionCamera(scale)
		const urls = []
		for (let i = 0; i < 5; i++) {
			if (i === 1) model.rotateY(Math.PI / 4)
			if (i !== 0) model.rotateY(Math.PI / 2)

			this.render(false)
			urls.push(this.canvasElement.toDataURL('image/png'))
		}

		// Bottom
		const box = new Box3().setFromObject(this.model.getModel())
		const center = box.getCenter(new Vector3())
		model.position.setY(center.y)
		model.rotation.set(0.25 * Math.PI, 1.75 * Math.PI, 0.75 * Math.PI)
		this.positionCamera(scale, false)
		this.render(false)
		urls.push(this.canvasElement.toDataURL('image/png'))
		model.position.setY(0)

		// Top
		model.rotation.set(0, 1.75 * Math.PI, 1.75 * Math.PI)
		this.positionCamera(scale, false)
		this.render(false)
		urls.push(this.canvasElement.toDataURL('image/png'))

		const [entityTexture, gm1Logo, ...modelRenders] = await Promise.all([
			this.loadImage(this.texturePath),
			this.loadImage('./gm1.webp'),
			...urls.map((url) => this.loadImage(url)),
		])

		ctx.fillStyle = '#121212'
		ctx.fillRect(0, 0, canvas.width, canvas.height)
		ctx.drawImage(
			modelRenders[0],
			0,
			100 * res,
			400 * res,
			(400 * res) / this.camera.aspect
		)

		for (let i = 0; i < 3; i++) {
			ctx.drawImage(
				modelRenders[i + 1],
				650 * res,
				i * 200 * res,
				200 * res,
				(200 * res) / this.camera.aspect
			)
		}
		for (let i = 0; i < 3; i++) {
			ctx.drawImage(
				modelRenders[i + 4],
				1050 * res,
				i * 200 * res,
				200 * res,
				(200 * res) / this.camera.aspect
			)
		}

		ctx.drawImage(entityTexture, 400 * res, 200 * res, 200 * res, 200 * res)
		ctx.drawImage(
			gm1Logo,
			canvas.width - 50 * res,
			canvas.height - 50 * res,
			50 * res,
			50 * res
		)

		canvas
			.convertToBlob()
			.then((blob) => URL.createObjectURL(blob))
			.then((url) => window.open(url))
	}

	protected loadImage(imageSrc: string) {
		return new Promise<HTMLImageElement>((resolve) => {
			const image = new Image()
			image.src = imageSrc
			image.addEventListener('load', () => resolve(image))
		})
	}
}
