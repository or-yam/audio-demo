class Processor extends AudioWorkletProcessor {
  process([input], [output]) {
    output[0].set(input[0]);
    return true;
  }
}

registerProcessor('processor', Processor);
