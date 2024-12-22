import {useState} from "react"
import { Button} from "@/components/ui/button"
import {Card,CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input"

export default function TestPrettier()   {
const [text,setText]=useState("")

    function handleClick(){
console.log("clicked")
    setText("")
}

  return (
 <Card>
      <CardContent className='p-4'>
        <Input value={text} onChange={(e)=>setText(e.target.value)}/>
          <Button onClick={handleClick} className="mt-2">
            Clear
          </Button>
      </CardContent>
    </Card>
  )
}
