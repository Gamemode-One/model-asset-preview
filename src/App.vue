<template>
	<img alt="Vue logo" src="./assets/gm1.webp" />
	<h1>model-asset-preview</h1>

	<div v-if="!shouldRender">
		<!-- <h2>Quality:</h2>
		<select v-model="quality">
			<option value="1">1x</option>
			<option value="4">4x</option>
			<option value="6">6x</option>
			<option value="8">8x</option>
			<option value="9">9x</option>
			<option value="10">10x</option>
		</select> -->
		<h2>Model:</h2>
		<input type="file" @change="onAddedModel" />
		<h2>Texture:</h2>
		<input type="file" @change="onAddedTexture" />
	</div>
	<p v-else>Loading...</p>

	<ModelViewer
		v-if="shouldRender"
		:model="model"
		:texture="texture"
		:quality="qualityNumber"
		@ready="onReady"
	/>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ModelViewer from './components/ModelViewer.vue'

const model = ref<any | undefined>(undefined)
async function onAddedModel(event: Event) {
	const eventTarget = event.target as HTMLInputElement
	const file = eventTarget?.files?.[0]
	if (!file) return

	const geometry = JSON.parse(await file.text())
	if (!geometry['minecraft:geometry']) {
		// Old model format
		const modelData: any = Object.values(geometry)[0]
		const transformedModel: any = {
			description: {},
			bones: [],
		}

		transformedModel.description.texture_width = modelData.texturewidth
		transformedModel.description.texture_height = modelData.textureheight
		transformedModel.bones = modelData.bones
		model.value = transformedModel
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
}

const shouldRender = computed(() => !!model.value && !!texture.value)
</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 60px;
}
img {
	height: 100px;
}
</style>
