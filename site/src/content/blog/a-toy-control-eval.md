---
title: "A Toy Control Eval"
date: 2026-05-15
description: "An interactive toy model for how monitoring and review budgets change deployment risk."
tags: ["control"]
kind: "essay"
draft: false
status: "seed"
---

This post is a small example of the kind of article I want this site to make easy:
the prose states a simple model, the figure lets the reader push on it, and the
takeaway is visible before the math becomes elaborate.

The toy setting is an automated research assistant that proposes code changes.
Some proposals are useful, some are suspicious, and a monitor can flag proposals
for human review. The important question is not "is monitoring good?" The question
is where monitoring stops buying much additional safety.

## The toy model

The model has four knobs.

- **Capability pressure** increases the chance that a model can find a harmful
  route when one exists.
- **Autonomy** increases the number of consequential choices the system can make
  without a human in the loop.
- **Monitor sensitivity** increases how often suspicious actions are caught.
- **Review budget** makes flags more useful, because a flag only matters if it
  can be investigated.

The model is deliberately simple. The point is to make a shape of argument
legible, not to estimate a real deployment.

<section class="explorable-demo" data-control-eval-demo>
<div class="explorable-header">
<h2>Where does review budget buy risk reduction?</h2>
</div>
<div class="explorable-threshold" aria-hidden="true">
<span></span><span></span><span></span><span></span><span></span>
</div>
<div class="explorable-layout">
<div class="explorable-controls" aria-label="Toy control eval controls">
<label><span>Capability pressure</span><input type="range" min="0" max="100" value="58" data-control="capability" /><output data-output="capability">58</output></label>
<label><span>Autonomy</span><input type="range" min="0" max="100" value="64" data-control="autonomy" /><output data-output="autonomy">64</output></label>
<label><span>Monitor sensitivity</span><input type="range" min="0" max="100" value="52" data-control="sensitivity" /><output data-output="sensitivity">52</output></label>
<label><span>Review budget</span><input type="range" min="0" max="100" value="44" data-control="review" /><output data-output="review">44</output></label>
</div>
<figure class="explorable-figure">
<svg viewBox="0 0 640 210" role="img" aria-label="Risk decomposition bars" data-risk-svg>
<path class="threshold-arc" d="M52 48 C160 18 278 20 378 48"></path>
<line x1="40" y1="158" x2="600" y2="158" class="axis"></line>
<g data-bars></g>
<g data-labels></g>
</svg>
<figcaption><strong>100 runs</strong><span>Green passes. Copper is caught. Purple is blocked. Red is residual risk.</span></figcaption>
</figure>
</div>
<div class="explorable-readout" aria-live="polite">
<div><span>Residual risk</span><strong data-readout="risk">0%</strong></div>
<div><span>Useful work</span><strong data-readout="useful">0%</strong></div>
<div><span>Flags reviewed</span><strong data-readout="flags">0%</strong></div>
</div>
<figure class="explorable-figure frontier">
<svg viewBox="0 0 640 230" role="img" aria-label="Sensitivity frontier" data-frontier-svg>
<path class="threshold-arc" d="M398 42 C462 18 540 20 594 48"></path>
<line x1="52" y1="178" x2="590" y2="178" class="axis"></line>
<line x1="52" y1="28" x2="52" y2="178" class="axis"></line>
<path data-frontier-path class="frontier-line"></path>
<circle data-frontier-point r="5" class="frontier-point"></circle>
<text x="52" y="204" class="axis-label">low sensitivity</text>
<text x="462" y="204" class="axis-label">high sensitivity</text>
<text x="62" y="36" class="axis-label">more residual risk</text>
</svg>
<figcaption><strong>Sensitivity sweep</strong><span>Capability, autonomy, and review budget stay fixed. The dot is the current setting.</span></figcaption>
</figure>
</section>

## What the figure is trying to show

At low monitor sensitivity, risk reduction is direct: more sensitivity catches
more bad actions. At higher sensitivity, review budget starts to dominate. A flag
that nobody can inspect is a weak control. A flag that routes into a real review
process can change the deployment boundary.

The other visible failure mode is over-blocking. If the monitor becomes noisy,
the system can look safer because it does less. In a real eval, that matters:
blocking useful work can hide the difference between "safe enough to deploy" and
"not useful enough to deploy."

## Why this belongs in the writing workflow

For the kinds of posts I expect to write, an interactive figure is often more
valuable than a static chart. It can expose a dependency that would otherwise be
buried in prose:

- Does the conclusion depend on one parameter being extreme?
- Does the intervention buy safety smoothly, or only past a threshold?
- Does reducing one kind of risk create a different kind of loss?

The intended writing loop is:

1. State the model in plain language.
2. Give the reader one interactive object.
3. Use the object to motivate the actual claim.
4. Leave the math more precise than the interface, not the other way around.

This example sketches the loop. A real control post would replace the toy
equations with eval data, ablations, or a concrete protocol.

<script type="module">
  const root = document.querySelector("[data-control-eval-demo]");

  if (root) {
    const controls = [...root.querySelectorAll("[data-control]")];
    const outputs = new Map(
      [...root.querySelectorAll("[data-output]")].map((item) => [item.dataset.output, item]),
    );
    const bars = root.querySelector("[data-bars]");
    const labels = root.querySelector("[data-labels]");
    const readout = new Map(
      [...root.querySelectorAll("[data-readout]")].map((item) => [item.dataset.readout, item]),
    );
    const frontierPath = root.querySelector("[data-frontier-path]");
    const frontierPoint = root.querySelector("[data-frontier-point]");

    function resolvedColor(name, fallback) {
      const probe = document.createElement("span");
      probe.style.color = `var(${name}, ${fallback})`;
      root.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color || fallback;
    }

    const colors = {
      useful: resolvedColor("--figure-useful", "#8ea36f"),
      caught: resolvedColor("--figure-caught", "#b8793a"),
      blocked: resolvedColor("--figure-blocked", "#7d6b8f"),
      risk: resolvedColor("--figure-risk", "#c7553d"),
    };

    function clamp(value, min = 0, max = 1) {
      return Math.max(min, Math.min(max, value));
    }

    function model(params) {
      const capability = params.capability / 100;
      const autonomy = params.autonomy / 100;
      const sensitivity = params.sensitivity / 100;
      const review = params.review / 100;

      const attackPressure = clamp(Math.pow(capability, 1.35) * Math.pow(autonomy, 1.15) * 0.72);
      const effectiveCatch = clamp(1 - (1 - Math.pow(sensitivity, 1.1)) * (1 - 0.68 * Math.pow(review, 0.8)));
      const falsePositive = clamp(0.05 + 0.22 * Math.pow(sensitivity, 1.8) * (1 - 0.35 * review));

      const risk = attackPressure * (1 - effectiveCatch);
      const caught = attackPressure * effectiveCatch;
      const blocked = (1 - attackPressure) * falsePositive;
      const useful = clamp(1 - risk - caught - blocked);
      const flags = clamp(caught + blocked);

      return { useful, caught, blocked, risk, flags };
    }

    function paramsFromControls() {
      return Object.fromEntries(
        controls.map((control) => [control.dataset.control, Number(control.value)]),
      );
    }

    function pct(value) {
      return `${Math.round(value * 100)}%`;
    }

    function rgbParts(color) {
      return color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    }

    function relativeLuminance(color) {
      const [r, g, b] = rgbParts(color).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function barLabelPaint(background) {
      const useDarkText = relativeLuminance(background) > 0.43;
      return {
        fill: useDarkText ? "#10110e" : "#fff4dc",
        backplate: useDarkText ? "rgba(255, 246, 222, 0.72)" : "rgba(8, 10, 8, 0.58)",
      };
    }

    function svgEl(name) {
      return document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    function drawBars(result) {
      const segments = [
        ["useful", "Useful work", result.useful],
        ["caught", "Caught bad actions", result.caught],
        ["blocked", "Blocked useful work", result.blocked],
        ["risk", "Uncaught bad actions", result.risk],
      ];
      let x = 40;
      const y = 84;
      const height = 54;
      const width = 560;

      bars.innerHTML = "";
      labels.innerHTML = "";

      segments.forEach(([key, label, value], index) => {
        const segmentWidth = width * value;
        const rect = svgEl("rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", Math.max(0, segmentWidth));
        rect.setAttribute("height", height);
        rect.setAttribute("rx", 4);
        rect.setAttribute("fill", colors[key]);
        bars.append(rect);

        if (segmentWidth > 54) {
          const labelText = pct(value);
          const labelWidth = labelText.length * 6.4 + 13;
          const centerX = x + segmentWidth / 2;
          const centerY = y + height / 2;
          const labelPaint = barLabelPaint(colors[key]);
          const group = svgEl("g");
          group.setAttribute("class", "bar-label-group");

          const backplate = svgEl("rect");
          backplate.setAttribute("class", "bar-label-backplate");
          backplate.setAttribute("x", centerX - labelWidth / 2);
          backplate.setAttribute("y", centerY - 10);
          backplate.setAttribute("width", labelWidth);
          backplate.setAttribute("height", 20);
          backplate.setAttribute("rx", 5);
          backplate.style.fill = labelPaint.backplate;

          const text = svgEl("text");
          text.setAttribute("x", centerX);
          text.setAttribute("y", centerY + 0.5);
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("class", "bar-label");
          text.style.fill = labelPaint.fill;
          text.textContent = labelText;

          group.append(backplate, text);
          labels.append(group);
        }

        const legend = svgEl("text");
        legend.setAttribute("x", 40 + (index % 2) * 280);
        legend.setAttribute("y", 180 + Math.floor(index / 2) * 16);
        legend.setAttribute("class", "axis-label");
        legend.textContent = `${label}: ${pct(value)}`;
        labels.append(legend);

        x += segmentWidth;
      });
    }

    function drawFrontier(params) {
      const points = [];
      for (let sensitivity = 0; sensitivity <= 100; sensitivity += 2) {
        const risk = model({ ...params, sensitivity }).risk;
        const x = 52 + (sensitivity / 100) * 538;
        const y = 178 - risk * 520;
        points.push([x, clamp(y, 28, 178)]);
      }

      frontierPath.setAttribute(
        "d",
        points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" "),
      );

      const current = model(params).risk;
      frontierPoint.setAttribute("cx", 52 + (params.sensitivity / 100) * 538);
      frontierPoint.setAttribute("cy", clamp(178 - current * 520, 28, 178));
    }

    function update() {
      const params = paramsFromControls();
      controls.forEach((control) => {
        const output = outputs.get(control.dataset.control);
        if (output) output.textContent = control.value;
      });

      const result = model(params);
      drawBars(result);
      drawFrontier(params);

      readout.get("risk").textContent = pct(result.risk);
      readout.get("useful").textContent = pct(result.useful);
      readout.get("flags").textContent = pct(result.flags);
    }

    controls.forEach((control) => control.addEventListener("input", update));
    update();
  }
</script>
