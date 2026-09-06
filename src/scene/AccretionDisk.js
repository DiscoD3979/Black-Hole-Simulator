export class AccretionDisk {
  constructor(blackHoleRadius, options = {}) {
    this.innerRadius = options.innerRadius !== undefined ? options.innerRadius : blackHoleRadius * 2.3
    this.outerRadius = options.outerRadius !== undefined ? options.outerRadius : blackHoleRadius * 11.0
    this.density = options.density !== undefined ? options.density : 0.6
    this.temperature = options.temperature !== undefined ? options.temperature : 0.55
    this.accretionSpeed = options.accretionSpeed !== undefined ? options.accretionSpeed : 0.0
    this.spiralTightness = options.spiralTightness !== undefined ? options.spiralTightness : 4.0
    this.dopplerStrength = options.dopplerStrength !== undefined ? options.dopplerStrength : 0.4
    this._shaderCache = null
  }

  getUniforms() {
    return {
      uDiskInnerRadius: this.innerRadius,
      uDiskOuterRadius: this.outerRadius,
      uDiskDensity: this.density,
      uDiskTemperature: this.temperature,
      uDiskAccretionSpeed: this.accretionSpeed,
      uDiskSpiralTightness: this.spiralTightness,
      uDiskDopplerStrength: this.dopplerStrength,
    }
  }

  async getShaderSource() {
    if (!this._shaderCache) {
      const resp = await fetch('shaders/disk.glsl')
      this._shaderCache = await resp.text()
    }
    return this._shaderCache
  }

  setParam(name, value) {
    if (name === 'innerRadius') this.innerRadius = value
    else if (name === 'outerRadius') this.outerRadius = value
    else if (name === 'density') this.density = value
    else if (name === 'temperature') this.temperature = value
    else if (name === 'accretionSpeed') this.accretionSpeed = value
    else if (name === 'spiralTightness') this.spiralTightness = value
    else if (name === 'dopplerStrength') this.dopplerStrength = value
  }
}
