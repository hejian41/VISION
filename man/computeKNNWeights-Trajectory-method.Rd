% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/methods-Trajectory.R
\docType{methods}
\name{computeKNNWeights,Trajectory-method}
\alias{computeKNNWeights,Trajectory-method}
\title{Compute KNN weights based on geodesic distances for Trajectory objects}
\usage{
\S4method{computeKNNWeights}{Trajectory}(object,
  K = round(sqrt(nrow(object@progressions))))
}
\arguments{
\item{object}{a Trajectory object}

\item{K}{the number of nearest neighbors to look at}
}
\value{
a list of two items:
         indices: matrix, cells X neighbors
             Each row specifies indices of nearest neighbors
         weights: matrix, cells X neighbors
             Corresponding weights to nearest neighbors
}
\description{
Compute KNN weights based on geodesic distances for Trajectory objects
}
