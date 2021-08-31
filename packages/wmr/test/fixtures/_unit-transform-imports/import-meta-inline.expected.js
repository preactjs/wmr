// @ts-ignore
let m = import(foo);
// @ts-ignore
bar.accept(async ({ module }) => {
	// @ts-ignore
	m = await m;
});
