export function vbaProcedures(source:string){return [...source.matchAll(/^\s*(?:(?:Public|Private)\s+)?Sub\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(\s*\)/gimu)].map(match=>match[1]);}
export const vbaExample=`Option Explicit
Sub PrismaPrueba()
    Dim fila As Long
    Dim subtotal As Double
    subtotal = 0
    For fila = 2 To 6
        Cells(fila, 4).Value = Cells(fila, 2).Value * Cells(fila, 3).Value
        subtotal = subtotal + Cells(fila, 4).Value
    Next fila
    Range("D8").Value = subtotal
    Range("D9").Formula = "=ROUND(D8*0.19,2)"
    Range("D10").Formula = "=D8+D9"
End Sub`;
