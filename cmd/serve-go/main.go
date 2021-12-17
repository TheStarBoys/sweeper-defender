package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

var fileName = "./index.html"

func main() {
	if len(os.Args) >= 2 {
		fileName = os.Args[1]
	}
	http.HandleFunc("/", handler)
	fmt.Println("You can open http://localhost:3001 at browser now.")
	http.ListenAndServe(":3001", nil)
}

func handler(w http.ResponseWriter, req *http.Request) {
	fmt.Println("Call", req.URL.Path)
	if req.URL.Path == "/" {
		http.ServeFile(w, req, "./index.html")
		return
	}

	path := strings.Replace(req.URL.Path, "/", "./", 1)
	http.ServeFile(w, req, path)
}
