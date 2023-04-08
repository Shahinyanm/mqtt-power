<script lang="ts">
  import { onMount } from "svelte";
  import * as Paho from "paho-mqtt";

  let client: Paho.Client;

  const POWER_TOPIC = "my-mqtt-app/power";

  let power = 0;

  function connect() {
    const clientId = `my-mqtt-app-${Math.random().toString(16).substr(2, 8)}`;
    client = new Paho.Client("test.mosquitto.org", 8081, clientId);
    client.onMessageArrived = onMessage;
    client.connect({ onSuccess: onConnect });
  }

  function onConnect() {
    client.subscribe(POWER_TOPIC);
  }

  function onMessage(message: Paho.Message) {
    power = parseInt(message.payloadString, 10);
  }

  function updatePower(newPower: number) {
    power = newPower;
    const message = new Paho.Message(newPower.toString());
    message.destinationName = POWER_TOPIC;
    client.send(message);
  }

  onMount(() => {
    connect();
  });
</script>

<div>
  <h2>Мощность: {power} %</h2>
  <input bind:value={power} max="100" min="0" on:change={() => updatePower(power)} step="1" type="range" />
</div>