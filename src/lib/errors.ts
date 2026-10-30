/** Pesan error yang aman ditampilkan ke pengguna (dilempar dari server function). */
export class PesanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PesanError"
  }
}
