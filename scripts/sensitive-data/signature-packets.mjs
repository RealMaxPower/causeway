// Structural recognition only, not cryptographic signature verification.
// RFC 9580 §§4.2, 5.2 and OpenSSH PROTOCOL.sshsig. Unsupported forms stay scanned.
class Reader {
  constructor(bytes) { this.bytes = bytes; this.offset = 0; }
  take(length) {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.bytes.length) throw new Error();
    const value = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
  number(width) { return this.take(width).readUIntBE(0, width); }
  string() { return this.take(this.number(4)); }
  get done() { return this.offset === this.bytes.length; }
}

function pgpLength(reader, subpacket = false) {
  const first = reader.number(1);
  if (first < 192) return first;
  if (first === 255) return reader.number(4);
  if (first < 224 || subpacket) return ((first - 192) << 8) + reader.number(1) + 192;
  throw new Error(); // Partial-body lengths are not classified as fixed signatures.
}

function pgpSubpackets(bytes) {
  const reader = new Reader(bytes);
  while (!reader.done) {
    const part = new Reader(reader.take(pgpLength(reader, true)));
    const type = part.number(1) & 127;
    if (type === 2 || type === 3) part.take(4); // Creation/expiration seconds.
    else if (type === 16) part.take(8); // Issuer key ID.
    else if (type === 33) {
      const version = part.number(1);
      if (version !== 4 && version !== 6) throw new Error();
      part.take(version === 4 ? 20 : 32);
    } else throw new Error(); // Includes notation, policy URI and signer identity.
    if (!part.done) throw new Error();
  }
}

function pgpMpi(reader, maximumBits) {
  const bits = reader.number(2);
  if (bits < 1 || bits > maximumBits) throw new Error();
  reader.take(Math.ceil(bits / 8)); // Some signers retain key-width padding.
}

export function isPgpSignature(bytes) {
  try {
    const outer = new Reader(bytes), header = outer.number(1);
    if (!(header & 128)) return false;
    let length;
    if (header & 64) {
      if ((header & 63) !== 2) return false;
      length = pgpLength(outer);
    } else {
      if (((header >> 2) & 15) !== 2 || (header & 3) === 3) return false;
      length = outer.number(2 ** (header & 3));
    }
    const packet = new Reader(outer.take(length));
    if (!outer.done || packet.number(1) !== 4 || ![0, 1].includes(packet.number(1))) return false;
    const algorithm = packet.number(1), hash = packet.number(1);
    if (![2, 8, 9, 10, 11].includes(hash)) return false;
    pgpSubpackets(packet.take(packet.number(2)));
    pgpSubpackets(packet.take(packet.number(2)));
    packet.take(2); // Leftmost digest bits.
    if ([1, 3].includes(algorithm)) pgpMpi(packet, 16384);
    else if ([17, 19, 22].includes(algorithm)) {
      pgpMpi(packet, 1024); pgpMpi(packet, 1024);
    } else if (algorithm === 27) packet.take(64);
    else if (algorithm === 28) packet.take(114);
    else return false;
    return packet.done;
  } catch { return false; }
}

function positiveSshMpi(bytes) {
  if (!bytes.length || bytes.length > 2049 || bytes[0] & 128) throw new Error();
  if (bytes[0] === 0 && (bytes.length === 1 || !(bytes[1] & 128))) throw new Error();
}

export function isSshSignature(bytes) {
  try {
    const outer = new Reader(bytes);
    if (!outer.take(6).equals(Buffer.from('SSHSIG')) || outer.number(4) !== 1) return false;
    const key = new Reader(outer.string());
    if (!outer.string().equals(Buffer.from('git')) || outer.string().length !== 0) return false;
    const hash = outer.string();
    if (!['sha256', 'sha512'].some((name) => Buffer.from(name).equals(hash))) return false;
    const signature = new Reader(outer.string());
    if (!outer.done) return false;
    const algorithm = key.string().toString('utf8');
    const signatureAlgorithm = signature.string().toString('utf8');
    if (algorithm === 'ssh-ed25519') {
      if (key.string().length !== 32 || signatureAlgorithm !== algorithm || signature.string().length !== 64) return false;
    } else if (algorithm === 'ssh-rsa') {
      positiveSshMpi(key.string());
      const modulus = key.string(); positiveSshMpi(modulus);
      if (!['rsa-sha2-256', 'rsa-sha2-512'].includes(signatureAlgorithm)) return false;
      const value = signature.string();
      if (!value.length || value.length > modulus.length) return false;
    } else if (['ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'].includes(algorithm)) {
      const curve = algorithm.slice('ecdsa-sha2-'.length);
      const size = { nistp256: 32, nistp384: 48, nistp521: 66 }[curve];
      if (!key.string().equals(Buffer.from(curve)) || signatureAlgorithm !== algorithm) return false;
      const point = key.string();
      if (point.length !== 1 + 2 * size || point[0] !== 4) return false;
      const values = new Reader(signature.string());
      for (let index = 0; index < 2; index++) {
        const value = values.string(); positiveSshMpi(value);
        if (value.length > size + 1) return false;
      }
      if (!values.done) return false;
    } else return false; // Certificates and other key forms remain ordinarily scanned.
    return key.done && signature.done;
  } catch { return false; }
}
