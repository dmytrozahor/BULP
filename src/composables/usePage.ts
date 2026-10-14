import { computed, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGE_SIZE, pageCount, pageSlice, parsePage } from '../lib/page.ts'

/** SPEC 63 NV-1: the current page lives in the URL query (`?p=`, 1-based; a second list on the same page uses another key); other query keys are kept. */
export function usePage(total: Ref<number>, size = PAGE_SIZE, qkey = 'p') {
  const route = useRoute(), router = useRouter()
  const pages = computed(() => pageCount(total.value, size))
  const page = computed(() => parsePage(route.query[qkey], pages.value))
  const go = (p: number) => { const q = { ...route.query }; if (p <= 1) delete q[qkey]; else q[qkey] = String(p); router.push({ path: route.path, query: q }) }
  const slice = <T>(items: readonly T[]) => pageSlice(items, page.value, size)
  return { page, pages, go, slice, size }
}
