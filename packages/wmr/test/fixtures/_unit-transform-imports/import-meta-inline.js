// @ts-ignore
let m = import(import.meta.url);
// @ts-ignore
import.meta.hot.accept(async ({ module }) => {
	// @ts-ignore
	m = await m;
});
