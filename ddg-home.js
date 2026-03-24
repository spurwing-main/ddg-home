function main() {
	function closeSubModal() {
		// modal is .c-newsletter-sub, close button is .newsletter-sub_close
		const modal = document.querySelector(".c-newsletter-sub");
		const closeButton = modal.querySelector(".newsletter-sub_close");
		closeButton.addEventListener("click", () => {
			modal.style.display = "none";
		});
	}

	function subModalCTA() {
		// on click on button[name="show-substack-form"], animate in .newsletter-sub_embed using GSAP
		const button = document.querySelector('button[name="show-substack-form"]');
		const modal = document.querySelector(".c-newsletter-sub");
		const embed = modal.querySelector(".newsletter-sub_embed");
		button.addEventListener("click", () => {
			modal.style.display = "block";
			gsap.to(embed, { autoAlpha: 1, y: 0, duration: 0.5 });
		});
	}

	function heroTrail() {
		let imageUrls = []; // Shared global image URLs array

		(function collectImageUrls() {
			const listParent = document.querySelector('[hero-img="list"]');
			if (!listParent) {
				console.log("No 'hero-img=list' container found. No images to collect.");
				return;
			}

			const imgItems = listParent.querySelectorAll('[hero-img="item"]');
			imgItems.forEach((img) => {
				const src = img.getAttribute("src");
				if (src) imageUrls.push(src);
			});

			console.log(`Collected ${imageUrls.length} image URLs.`);
		})();

		let activeScript = null;
		let desktopP5Instance = null; // Store p5 instance for cleanup
		let mobileTweens = [];
		let mobileResizeTimeout = null;

		const mobileConfig = {
			minImagesOnScreen: 6,
			maxImagesOnScreen: 10,
			minXPercent: 8,
			maxXPercent: 92,
			minScale: 0.45,
			maxScale: 1.1,
			minWidthFactor: 0.18,
			maxWidthFactor: 0.34,
			minDuration: 9,
			maxDuration: 18,
			minStartOffset: 60,
			maxStartOffset: 220,
			minEndOffset: 80,
			maxEndOffset: 260,
			fadeInProgress: 0.14,
			fadeOutProgress: 0.12,
			minOpacity: 0.65,
			maxOpacity: 1,
			resizeDebounceMs: 150,
		};

		function randomBetween(min, max) {
			return gsap.utils.random(min, max, 0.001);
		}

		function randomInt(min, max) {
			return Math.floor(gsap.utils.random(min, max + 0.999));
		}

		function getRandomImageUrl() {
			if (!imageUrls.length) return null;
			return imageUrls[randomInt(0, imageUrls.length - 1)];
		}

		function getViewportHeight() {
			return window.innerHeight || document.documentElement.clientHeight || 0;
		}

		function spawnMobileImage(img, canvasDiv, startProgress = null) {
			const imageUrl = getRandomImageUrl();
			if (!imageUrl) return;

			const containerWidth = canvasDiv.offsetWidth || window.innerWidth;
			const viewportHeight = getViewportHeight();
			const startY =
				viewportHeight + randomBetween(mobileConfig.minStartOffset, mobileConfig.maxStartOffset);
			const endY = -randomBetween(mobileConfig.minEndOffset, mobileConfig.maxEndOffset);
			const xPercent = randomBetween(mobileConfig.minXPercent, mobileConfig.maxXPercent);
			const scale = randomBetween(mobileConfig.minScale, mobileConfig.maxScale);
			const width = Math.round(
				containerWidth * randomBetween(mobileConfig.minWidthFactor, mobileConfig.maxWidthFactor),
			);
			const duration = randomBetween(mobileConfig.minDuration, mobileConfig.maxDuration);
			const targetOpacity = randomBetween(mobileConfig.minOpacity, mobileConfig.maxOpacity);

			img.setAttribute("src", imageUrl);
			img.style.width = `${width}px`;
			img.style.left = `${xPercent}%`;

			gsap.set(img, {
				xPercent: -50,
				y: startY,
				scale,
				opacity: 0,
				zIndex: 2,
				force3D: true,
			});

			const tween = gsap.to(img, {
				y: endY,
				duration,
				ease: "none",
				onUpdate() {
					const progress = tween.progress();
					let opacity = targetOpacity;

					if (progress < mobileConfig.fadeInProgress) {
						opacity = gsap.utils.interpolate(
							0,
							targetOpacity,
							progress / mobileConfig.fadeInProgress,
						);
					} else if (progress > 1 - mobileConfig.fadeOutProgress) {
						opacity = gsap.utils.interpolate(
							targetOpacity,
							0,
							(progress - (1 - mobileConfig.fadeOutProgress)) / mobileConfig.fadeOutProgress,
						);
					}

					gsap.set(img, { opacity });
				},
				onComplete() {
					const tweenIndex = mobileTweens.indexOf(tween);
					if (tweenIndex !== -1) {
						mobileTweens.splice(tweenIndex, 1);
					}
					spawnMobileImage(img, canvasDiv);
				},
			});

			mobileTweens.push(tween);

			if (typeof startProgress === "number") {
				tween.progress(startProgress);
			}
		}

		function startDesktopAnimation() {
			if (activeScript === "desktop") return;
			if (!imageUrls.length) return;

			const canvasParent = document.getElementById("canvas-parent");
			if (!canvasParent) {
				console.log("No '#canvas-parent' container found.");
				return;
			}

			activeScript = "desktop";
			console.log("Starting desktop animation...");

			desktopP5Instance = new p5((p) => {
				let images = [];
				let queue = [];
				let lastMousePos = { x: 0, y: 0 };
				let imgIndex = 0;

				const thresholdVW = 15;
				const maxActiveTrails = 5;
				const scaleFactor = 6;
				const fadeDuration = 0.2;
				const fadeDurationMs = fadeDuration * 1000;

				function easeOutCubic(t) {
					return 1 - Math.pow(1 - t, 3);
				}

				p.preload = function () {
					imageUrls.forEach((url) => {
						images.push(p.loadImage(url));
					});
				};

				p.setup = function () {
					const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
					canvas.parent("canvas-parent");
					canvas.style("display", "block");
					canvas.style("position", "absolute");
					canvas.style("inset", "0");
					canvas.style("z-index", "2");
					lastMousePos = { x: p.mouseX, y: p.mouseY };
				};

				p.draw = function () {
					p.clear();
					const distThresholdPx = (p.windowWidth * thresholdVW) / 100;
					const d = p.dist(p.mouseX, p.mouseY, lastMousePos.x, lastMousePos.y);

					if (d > distThresholdPx) {
						queue.unshift({
							x: p.mouseX,
							y: p.mouseY,
							index: imgIndex,
							creationTime: p.millis(),
							fadeOutStart: null,
						});
						imgIndex = (imgIndex + 1) % images.length;
						lastMousePos = { x: p.mouseX, y: p.mouseY };
					}

					for (let i = maxActiveTrails; i < queue.length; i++) {
						if (queue[i].fadeOutStart === null) {
							queue[i].fadeOutStart = p.millis();
						}
					}

					const scaleVal = p.width / scaleFactor;

					for (let i = queue.length - 1; i >= 0; i--) {
						const item = queue[i];
						const img = images[item.index];
						if (!img) continue;

						const now = p.millis();
						const lifeElapsed = now - item.creationTime;
						let alphaVal;

						if (item.fadeOutStart === null) {
							const tIn = p.constrain(lifeElapsed / fadeDurationMs, 0, 1);
							alphaVal = easeOutCubic(tIn) * 255;
						} else {
							const outElapsed = now - item.fadeOutStart;
							const tOut = p.constrain(outElapsed / fadeDurationMs, 0, 1);
							alphaVal = 255 - easeOutCubic(tOut) * 255;
						}

						p.push();
						p.tint(255, alphaVal);
						const imgWidth = (img.width * scaleVal) / img.width;
						const imgHeight = (img.height * scaleVal) / img.width;
						p.image(img, item.x - imgWidth / 2, item.y - imgHeight / 2, imgWidth, imgHeight);
						p.pop();
					}

					for (let i = queue.length - 1; i >= 0; i--) {
						const item = queue[i];
						if (item.fadeOutStart !== null) {
							const outElapsed = p.millis() - item.fadeOutStart;
							const tOut = p.constrain(outElapsed / fadeDurationMs, 0, 1);
							const alphaVal = 255 - easeOutCubic(tOut) * 255;
							if (alphaVal <= 0) {
								queue.splice(i, 1);
							}
						}
					}
				};

				p.windowResized = function () {
					p.resizeCanvas(p.windowWidth, p.windowHeight);
				};
			});
		}

		function stopDesktopAnimation() {
			if (activeScript !== "desktop") return;
			console.log("Stopping desktop animation...");
			activeScript = null;
			if (desktopP5Instance) {
				desktopP5Instance.remove(); // Remove p5 instance and its canvas
				desktopP5Instance = null;
			}
		}

		function startMobileAnimation() {
			if (activeScript === "mobile") return;
			const canvasDiv = document.querySelector('[hero-img="canvas"]');
			if (!canvasDiv) {
				console.log("No 'hero-img=canvas' container found.");
				return;
			}
			if (!imageUrls.length) return;

			activeScript = "mobile";
			console.log("Starting mobile animation...");

			canvasDiv.innerHTML = "";
			canvasDiv.style.position = "absolute";
			canvasDiv.style.inset = "0";
			canvasDiv.style.overflow = "hidden";

			const imageCount = randomInt(mobileConfig.minImagesOnScreen, mobileConfig.maxImagesOnScreen);

			for (let index = 0; index < imageCount; index++) {
				const img = document.createElement("img");
				img.classList.add("bg-mobile-image");
				img.style.position = "absolute";
				img.style.top = "0";
				img.style.left = "50%";
				img.style.opacity = "0";
				img.style.pointerEvents = "none";
				canvasDiv.appendChild(img);
				spawnMobileImage(img, canvasDiv, randomBetween(0.08, 0.92));
			}
		}

		function stopMobileAnimation() {
			if (activeScript !== "mobile") return;
			console.log("Stopping mobile animation...");
			activeScript = null;
			mobileTweens.forEach((tween) => tween.kill());
			mobileTweens = [];

			const canvasDiv = document.querySelector('[hero-img="canvas"]');
			if (canvasDiv) canvasDiv.innerHTML = ""; // Cleanup mobile animation elements
		}

		function handleResize() {
			if (window.matchMedia("(min-width: 992px)").matches) {
				window.clearTimeout(mobileResizeTimeout);
				stopMobileAnimation();
				startDesktopAnimation();
			} else {
				stopDesktopAnimation();
				window.clearTimeout(mobileResizeTimeout);
				mobileResizeTimeout = window.setTimeout(() => {
					stopMobileAnimation();
					startMobileAnimation();
				}, mobileConfig.resizeDebounceMs);
			}
		}

		window.addEventListener("resize", handleResize);
		window.addEventListener("load", handleResize);
	}

	subModalCTA();
	closeSubModal();
	heroTrail();
}
