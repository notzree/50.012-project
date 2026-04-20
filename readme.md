# 50.012 Networks Project: AI Speed Test (Speedtest for LLM APIs)

**Course:** 50.012 Networks (2026 Spring)
**Theme:** Innovation & Entrepreneurship (I&E) in Computer Networks Field

## Project Overview

This project tackles the lack of practical benchmarking for LLM deployment decisions. While existing benchmarks focus heavily on model intelligence (accuracy, reasoning), developers lack a standardized way to evaluate the **real-world network and system performance** of LLM APIs (latency, throughput, reliability, and cost) in production systems.

Our novelty is shifting the evaluation from *model intelligence* to *system usability*, introducing standardized metrics and providing developers with a tool—an **"AI Speed Test"**—that enables them to choose models based on performance, reliability, and cost under real-world networking conditions.

## Problem Statement & Approach

**The Problem:** Current observability tools are fragmented and not standardized across providers. Traditional network tools (Speedtest, ping) measure raw network speeds but not AI-specific workloads like token generation rates or Time To First Byte (TTFT).

**The Solution (What we built):** A Next.js-based single-page web application ("Speedtest for LLM APIs") that sends standardized prompts to multiple AI models (OpenAI, Anthropic, Google, Groq). It measures key metrics and presents results in a dynamic real-time dashboard for direct comparison.

### Key Metrics Measured
* **TTFT (Time To First Byte):** The startup delay from prompt submission to the first streamed token.
* **TPS (Tokens Per Second):** The continuous throughput of token streaming.
* **Latency & RTT:** Network round-trip time affecting total response delay.
* **Success/Error Rate:** Reliability of the API provider under load.

## 🔌 Lecture Connections & Networking Concepts

This project directly implements and analyzes concepts covered in the 50.012 curriculum:

* **L2: Application Layer:** LLM APIs utilize HTTP (REST, Client-Server model) where requests are prompts and responses are generated outputs.
* **L3: Multimedia Streaming:** Similar to video streaming concepts, TTFT maps to startup delay, token streaming to continuous playout, and variability in token rate equates to network jitter.
* **L4: CDN & Distributed Systems:** Benchmarking distributed servers from different providers mapping how latency varies due to server geolocation, routing, and load balancing.
* **L5-8: Transport Layer (TCP & Congestion Control):** Exploring how RTT affects latency/TTFT, throughput determines tokens/sec, and how concurrency testing evaluates multiple flows competing for bandwidth (simulating AIMD congestion under heavy load).

## 💻 Architecture & Setup

The application is built using Next.js, React, and TailwindCSS. It utilizes custom API routes to act as a proxy or client-side direct benchmarking engine, allowing Bring-Your-Own-Key (BYOK) testing to measure both server-side and client-side (end-to-end) latency.

### Getting Started

To run the benchmarking suite locally:

1. Navigate to the `web` directory:
   ```bash
   cd web
   ```
2. Install dependencies (ensure you have Node.js installed):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
5. Provide your API keys in the dashboard interface and initiate the benchmark!

## 💾 Aggregating Data (Team Synchronization with Turso)
By default, the benchmark saves metrics to a local SQLite file (`local.db`) on your disk. To asynchronously collect data from multiple peers into a single centralized scoreboard:

1. **Environment**: In the `web` folder, make a copy of `.env.example` and rename it to `.env.local`.
2. **Link**: Insert the Turso Database URL and Auth Token that you have access to into `.env.local`.
3. Restart your `npm run dev` server. 

Now, when anyone on the team runs a speed test concurrently from anywhere, their records will natively write to our shared remote database and instantly populate the Community Results dashboard!

## 👥 Logistics & Collaboration
This project adheres to the 50.012 working logs requirements. Every team member maintains a working journal, tracking their activities, hours, and contributions, emphasizing the "do" aspect of protocol/code analysis and experiment design.
