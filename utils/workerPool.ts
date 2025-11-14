import { randomUUID } from "crypto";
import os from "os";
import { Worker } from "worker_threads";

type TaskPayload = Record<string, any>;

type WorkerResult = {
  jobId: string;
  error?: { message: string; stack?: string };
  result?: any;
};

interface WorkerPoolOptions {
  size?: number;
  workerPath: string;
}

export default class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private queue: {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    payload: TaskPayload;
  }[] = [];
  private tasks: Map<
    string,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
  > = new Map();

  constructor(options: WorkerPoolOptions) {
    const size = options.size || Math.max(2, Math.min(os.cpus().length, 4));
    for (let i = 0; i < size; i++) {
      const worker = new Worker(options.workerPath, {
        execArgv: ["-r", "ts-node/register"],
      });

      worker.on("message", (message: WorkerResult) => {
        const task = this.tasks.get(message.jobId);
        if (!task) {
          return;
        }
        this.tasks.delete(message.jobId);

        if (message.error) {
          const error = new Error(message.error.message);
          error.stack = message.error.stack;
          task.reject(error);
        } else {
          task.resolve(message.result);
        }

        this.availableWorkers.push(worker);
        this.processQueue();
      });

      worker.on("error", (err) => {
        console.error("Worker error", err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker exited with code ${code}`);
        }
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async runTask(payload: TaskPayload): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, payload });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.queue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const worker = this.availableWorkers.shift();
    if (!worker) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
      this.availableWorkers.push(worker);
      return;
    }

    const jobId = randomUUID();
    this.tasks.set(jobId, { resolve: task.resolve, reject: task.reject });
    worker.postMessage({ jobId, payload: task.payload });
  }

  async destroy() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
    this.workers = [];
    this.availableWorkers = [];
    this.queue = [];
    this.tasks.clear();
  }
}
