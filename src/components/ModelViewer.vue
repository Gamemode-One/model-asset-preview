<template>
	<div style="display: flex; justify-items: center; align-items: center">
		<ul
			style="list-style-type: none; padding-left: 0; padding-right: 24px"
			v-if="bones.length > 0 && !startRender"
		>
			<li v-for="[boneName, bone] in bones">
				<input
					type="checkbox"
					name="Toggle Visibility"
					:checked="bone.visible"
					:disabled="bone.userData.forcedVisibility"
					@change="toggleBone(bone)"
				/>
				{{ boneName }}
			</li>
		</ul>
		<canvas
			:style="{
				display: startRender ? 'none' : undefined,
				width,
				height,
				borderRadius: '12px',
				outline: 'none',
			}"
			ref="canvas"
		/>
	</div>
</template>

<script setup lang="ts">
import {
	onMounted,
	ref,
	defineProps,
	defineEmit,
	computed,
	watchEffect,
	inject,
} from 'vue'
import type { Ref } from 'vue'
import { StandaloneModelViewer } from './ModelViewer'
import { Group, Object3D } from 'three'

const props = defineProps({
	texture: String,
	model: Object,
	quality: { type: Number, default: 10 },
})
const emit = defineEmit(['ready'])
const startRender = inject<Ref<boolean>>('startRender') ?? ref(true)
const zoom = inject<Ref<number>>('zoom') ?? ref(1.5)

const width = computed(() => 1000 * props.quality)
const height = computed(() => 1000 * props.quality)

const canvas: Ref<HTMLCanvasElement | undefined> = ref(undefined)
let viewer: StandaloneModelViewer
const bones: Ref<[string, Group][]> = ref([])
onMounted(() => {
	if (!canvas.value) return

	viewer = new StandaloneModelViewer(
		canvas.value,
		props.model!,
		props.texture!,
		{
			width: 500,
			height: 500,
			antialias: true,
		}
	)
	viewer.onResize()
	viewer.positionCamera(zoom.value)
	setTimeout(async () => {
		viewer.requestRendering(true)
	}, 10)

	bones.value = [...viewer.getModel().getBoneMap().entries()]
})

watchEffect(() => {
	if (startRender.value || !canvas.value) return

	viewer = new StandaloneModelViewer(
		canvas.value!,
		props.model!,
		props.texture!,
		{
			width: 500,
			height: 500,
			antialias: true,
		}
	)
	viewer.onResize()
	viewer.positionCamera(zoom.value)

	const boneMap = viewer.getModel().getBoneMap()
	for (const [boneName, bone] of bones.value) {
		if (!bone.visible) toggleBone(boneMap.get(boneName)!, false)
	}

	setTimeout(async () => {
		viewer.requestRendering(true)
	}, 10)
})

watchEffect(() => {
	if (!startRender.value || !canvas.value) return
	viewer = new StandaloneModelViewer(
		canvas.value,
		props.model!,
		props.texture!,
		{
			width: width.value,
			height: height.value,
			antialias: true,
		}
	)

	const boneMap = viewer.getModel().getBoneMap()
	for (const [boneName, bone] of bones.value) {
		if (!bone.visible) toggleBone(boneMap.get(boneName)!, false)
	}

	viewer.onResize()
	viewer.positionCamera()

	setTimeout(async () => {
		viewer.requestRendering(true)
		await viewer.generatePreview(zoom.value, props.quality * 2)
		emit('ready')
	}, 10)
})

function toggleBone(bone: Object3D, isVisible = !bone.visible, isFirst = true) {
	if (bone.type === 'Group') {
		bone.visible = isVisible
		if (!isFirst)
			bone.userData.forcedVisibility = !bone.userData.forcedVisibility
	}

	for (const children of bone.children) {
		toggleBone(children, isVisible, false)
	}

	viewer.requestRendering()
}
</script>
