# MAX API TLS

`russian-trusted-root-ca.pem` is the public Russian Trusted Root CA certificate, downloaded over verified HTTPS from the official Gosuslugi CDN:
https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt

The MAX client adds this CA to Node's standard roots for its own HTTPS agent only. Certificate validity and hostname verification remain enabled; no system-wide trust store is modified. Keep this directory in runtime deployments alongside `apps/`.
