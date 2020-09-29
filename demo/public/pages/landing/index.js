import { h } from 'preact';
import s from './landing.module.css';

export function Landing() {
	return (
		<div class={s.root}>
			<header class={s.header}>
				<a href="#" class={s.logo}>
					Le Gradient
				</a>
				<nav class={s.menuPrimary}>
					<ul class={s.menuPrimaryList}>
						<li class={`${s.menuItem} ${s.active}`}>
							<a href="/landing">Home</a>
						</li>
						<li class={s.menuItem}>
							<a href="#">News</a>
						</li>
						<li class={s.menuItem}>
							<a href="#">Developers</a>
						</li>
						<li class={s.menuItem}>
							<a href="#">Contact</a>
						</li>
					</ul>
				</nav>
			</header>
			<section class={s.intro}>
				<div class={s.introLeft}>
					<div class={s.introContent}>
						<h1>
							Making
							<br />
							Colors
							<br />
							Beautiful
						</h1>
						<p class={s.text}>Color is a power which directly influences the soul. - Wassily Kandinsky</p>
					</div>
				</div>
			</section>
			<section>
				<h2 class={s.sectionHeading}>Color facts</h2>

				<div class={s.feature}>
					<div class={s.featureContainer}>
						<div class={s.aspect}>
							<div class={`${s.aspectInner} ${s.featureColor} ${s.red}`} />
						</div>
					</div>
					<div class={s.featureContent}>
						<h3 class={s.featureHeading}>Red pigment was one of the first colors used in prehistoric art</h3>
						<p class={s.featureText}>
							Modern surveys in Europe and the United States show red is also the color most commonly associated with
							heat, activity, passion, sexuality, anger, love, and joy. In China, India and many other Asian countries
							it is the color of symbolizing happiness and good fortune
						</p>
					</div>
				</div>

				<div class={`${s.feature} ${s.inverse}`}>
					<div class={s.featureContainer}>
						<div class={s.aspect}>
							<div class={`${s.aspectInner} ${s.featureColor} ${s.green}`} />
						</div>
					</div>
					<div class={s.featureContent}>
						<h3 class={s.featureHeading}>Eyes are most sensitive to green</h3>
						<p class={s.featureText}>
							n surveys made in American, European, and Islamic countries, green is the color most commonly associated
							with nature, life, health, youth, spring, hope, and envy. In the European Union and the United States,
							green is also sometimes associated with toxicity and poor health, but in China and most of Asia, its
							associations are very positive, as the symbol of fertility and happiness.
						</p>
					</div>
				</div>

				<blockquote class={s.quote}>
					<p>
						"All the other colors are just colors, but <b>purple</b> seems to have a <b>soul</b> — when you look at it,
						it's looking back at you."
					</p>
				</blockquote>

				<div class={`${s.feature}`}>
					<div class={s.featureContainer}>
						<div class={s.aspect}>
							<div class={`${s.aspectInner} ${s.featureColor} ${s.blue}`} />
						</div>
					</div>
					<div class={s.featureContent}>
						<h3 class={s.featureHeading}>Blue is the color of harmony</h3>
						<p class={s.featureText}>
							that blue is the colour most commonly associated with harmony, faithfulness, confidence, distance,
							infinity, the imagination, cold, and occasionally with sadness. In US and European public opinion polls it
							is the most popular colour, chosen by almost half of both men and women as their favourite colour.
						</p>
					</div>
				</div>

				<div class={`${s.feature} ${s.inverse}`}>
					<div class={s.featureContainer}>
						<div class={s.aspect}>
							<div class={`${s.aspectInner} ${s.featureColor} ${s.yellow}`} />
						</div>
					</div>
					<div class={s.featureContent}>
						<h3 class={s.featureHeading}>Yellow is a strong color</h3>
						<p class={s.featureText}>
							According to surveys in Europe, Canada, and the United States, yellow is the color people most often
							associate with amusement, gentleness, humor, and spontaneity, but also with duplicity, envy, jealousy,
							avarice, and, in the U.S., cowardice. In Iran it has connotations of pallor/sickness, but also wisdom and
							connection. In China and many Asian countries, it is seen as the color of happiness, glory, harmony and
							wisdom.
						</p>
					</div>
				</div>

				<div class={`${s.golden} ${s.green}`}>
					<div class={`${s.goldenHead} ${s.dark}`}>
						<h3>
							<span class={s.goldenNumber}>01</span>
							<span class={s.goldenTitle}>Wohoo</span>
						</h3>
					</div>
					<div class={`${s.goldenContent}`}>
						<p>&rarr;</p>
					</div>
				</div>
			</section>
			<footer class={s.footer}>
				<div class={s.footerInner}>&copy; 2020 &mdash; Blue dabeldi dabeldei</div>
			</footer>
		</div>
	);
}
