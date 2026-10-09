<script lang="ts">
  /* Statische Legende der Farben, Linien und Marker */
</script>

<div id="legend">
  <div class="row"><span class="dot" style="background:var(--accent-service)"></span>Service</div>
  <div class="row"><span class="dot" style="background:var(--accent-frontend)"></span>Frontend</div>
  <div class="row"><span class="dot" style="background:var(--accent-db)"></span>Datenbank</div>
  <div class="row" style="color:var(--accent-rest)"><span class="swatch" style="background:var(--accent-rest)"></span>REST-Verbindung →</div>
  <div class="row" style="color:var(--accent-ws)"><span class="swatch dashed" style="color:var(--accent-ws)"></span>WebSocket (REST-Sonderfall) ⇄</div>
  <div class="row" style="color:var(--accent-event)"><span class="swatch" style="background:var(--accent-event)"></span>Event-Verbindung →</div>
  <div class="row" style="color:var(--accent-dbconn)"><span class="swatch dashed" style="color:var(--accent-dbconn)"></span>Datenbank-Verbindung</div>
  <div class="row" style="color:var(--accent-sim)"><span class="swatch" style="background:var(--accent-sim)"></span>Simulierter Event-Fluss</div>
  <div class="row" style="color:var(--danger)"><span class="legend-marker" style="border-color:var(--danger)">!</span>Zyklus in Event-Kette</div>
  <div class="row" style="color:var(--warn)"><span class="legend-marker" style="border-color:var(--warn)">?</span>Offene Enden (Ziel / Trigger)</div>
</div>
