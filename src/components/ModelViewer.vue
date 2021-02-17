<template>
	<canvas
		:style="{
			display: 'none',
			width,
			height,
		}"
		ref="canvas"
	/>
</template>

<script setup lang="ts">
import { onMounted, ref, defineProps, defineEmit, computed } from 'vue'
import type { Ref } from 'vue'
import { StandaloneModelViewer } from './ModelViewer'

const props = defineProps({
	texture: String,
	model: Object,
	quality: { type: Number, default: 10 },
})
const emit = defineEmit(['ready'])

const width = computed(() => 1000 * props.quality)
const height = computed(() => 1000 * props.quality)

const canvas: Ref<HTMLCanvasElement | undefined> = ref(undefined)
onMounted(() => {
	if (!canvas.value) return

	const viewer = new StandaloneModelViewer(
		canvas.value,
		props.model!,
		props.texture!,
		{
			width: width.value,
			height: height.value,
			antialias: true,
		}
	)
	viewer.onResize()
	viewer.positionCamera()
	setTimeout(async () => {
		viewer.requestRendering(true)
		await viewer.generatePreview(1.5, props.quality * 2)
		emit('ready')
	}, 10)
})
</script>
