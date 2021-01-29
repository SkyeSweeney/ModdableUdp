export class Header_t extends DataView {
   constructor(data, offset) {
      if (data)
         super(data, offset ?? 0, 8);
       else
         super(new ArrayBuffer(8));
   }
   get msgId() {
      return this.getUint16(0, true);
   }
   set msgId(value) {
      this.setUint16(0, value, true);
   }
   get version() {
      return this.getUint8(2);
   }
   set version(value) {
      this.setUint8(2, value);
   }
   get flags() {
      return this.getUint8(3);
   }
   set flags(value) {
      this.setUint8(3, value);
   }
   get source() {
      return this.getUint16(4, true);
   }
   set source(value) {
      this.setUint16(4, value, true);
   }
   get spare() {
      return this.getUint16(6, true);
   }
   set spare(value) {
      this.setUint16(6, value, true);
   }
}

export class EnvBody_t extends DataView {
   constructor(data, offset) {
      if (data)
         super(data, offset ?? 0, 14);
       else
         super(new ArrayBuffer(14));
   }
   get temperature() {
      return this.getFloat32(0, true);
   }
   set temperature(value) {
      this.setFloat32(0, value, true);
   }
   get pressure() {
      return this.getFloat32(4, true);
   }
   set pressure(value) {
      this.setFloat32(4, value, true);
   }
   get humidity() {
      return this.getFloat32(8, true);
   }
   set humidity(value) {
      this.setFloat32(8, value, true);
   }
   get radiationLevel() {
      return this.getUint16(12, true);
   }
   set radiationLevel(value) {
      this.setUint16(12, value, true);
   }
}

export class Messages_t extends DataView {
   constructor(data, offset) {
      if (data)
         super(data, offset ?? 0);
       else
         super(new ArrayBuffer(22));
   }
   get header() {
      return new Header_t(this.buffer, this.byteOffset);
   }
   set header(value) {
      for (let i = 0; i < 8; i++)
         this.setUint8(i + 0, value.getUint8(i));
   }
   get envBody() {
      return new EnvBody_t(this.buffer, this.byteOffset + 8);
   }
   set envBody(value) {
      for (let i = 0; i < 14; i++)
         this.setUint8(i + 8, value.getUint8(i));
   }
}

/*

View classes generated by https://phoddie.github.io/compileDataView on Thu Jan 28 2021 20:54:09 GMT-0500 (Eastern Standard Time) from the following description:


struct Header_t {
    uint16_t      msgId;
    uint8_t       version;
    uint8_t       flags;
    uint16_t      source;
    uint16_t      spare;
}

struct  EnvBody_t {
    float       temperature;
    float       pressure;
    float       humidity;
    uint16_t    radiationLevel;
}

#pragma checkByteLength(false)
struct Messages_t {
    Header_t    header;
    union {
        EnvBody_t  envBody;
    }
}

*/