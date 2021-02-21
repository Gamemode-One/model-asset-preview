<template>
	<div class="d-flex">
		<img alt="Vue logo" src="./assets/gm1.webp" />
		<h1>model-asset-preview</h1>
	</div>
	<div class="d-flex" v-if="!startRender">
		<div class="control">
			<h2>Quality:</h2>
			<select v-model="quality">
				<option value="1">1x</option>
				<option value="2">2x</option>
				<option value="3">3x</option>
				<option value="4">4x</option>
				<!-- <option value="6">6x</option>
			<option value="8">8x</option>
			<option value="9">9x</option>
			<option value="10">10x</option> -->
			</select>
		</div>

		<div class="control">
			<h2>Model:</h2>
			<input type="file" @change="onAddedModel" />
		</div>

		<div class="control">
			<h2>Texture:</h2>
			<input type="file" @change="onAddedTexture" />
		</div>

		<button class="render-button" @click="render" :disabled="!shouldRender">
			Render
		</button>

		<ModelViewer
			v-if="shouldRender"
			:startRender="startRender"
			:model="model"
			:texture="texture"
			:quality="qualityNumber"
			@ready="onReady"
		/>
	</div>
	<p style="text-align: center" v-else>Loading...</p>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import ModelViewer from './components/ModelViewer.vue'

const model = ref<any | undefined>(undefined)
async function onAddedModel(event: Event) {
	const eventTarget = event.target as HTMLInputElement
	const file = eventTarget?.files?.[0]
	if (!file) return

	const geometry = JSON.parse(await file.text())
	if (!geometry['minecraft:geometry']) {
		// Old model format
		const modelData: any = Object.values(geometry).find(
			(val) => typeof val !== 'string'
		)
		if (!modelData) return

		const transformedModel: any = {
			description: {},
			bones: [],
		}

		transformedModel.description.texture_width = modelData.texturewidth
		transformedModel.description.texture_height = modelData.textureheight
		transformedModel.bones = modelData.bones
		model.value = transformedModel
		console.log(transformedModel, modelData)
	} else {
		// New model format

		model.value = geometry['minecraft:geometry'][0]
	}
}

const texture = ref<string | undefined>(undefined)
async function onAddedTexture(event: Event) {
	const eventTarget = event.target as HTMLInputElement
	const file = eventTarget?.files?.[0]
	if (!file) return

	const reader = new FileReader()
	reader.addEventListener('load', () => {
		if (typeof reader.result !== 'string') return

		texture.value = reader.result
	})
	reader.addEventListener('error', (err) => console.error(err))

	reader.readAsDataURL(file)
}

const quality = ref('4')
const qualityNumber = computed(() => Number(quality.value))

function onReady() {
	model.value = undefined
	texture.value = undefined
	startRender.value = false
}

const shouldRender = computed(() => !!model.value && !!texture.value)

const startRender = ref(false)
provide('startRender', startRender)

function render() {
	startRender.value = true
}
</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	color: #2c3e50;
	margin-top: 60px;
}
img {
	height: 100px;
}

.render-button {
	display: inline-block;
	margin: 24px 0;
}
.d-flex {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.control {
	display: flex;
	align-items: center;
}
h2 {
	margin-right: 12px;
}
</style>
